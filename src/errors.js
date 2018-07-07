import ESM from "./constant/esm.js"

import captureStackTrace from "./error/capture-stack-trace.js"
import getLocationFromStackTrace from "./error/get-location-from-stack-trace.js"
import getModuleURL from "./util/get-module-url.js"
import { inspect } from "./safe/util.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"
import toStringLiteral from "./util/to-string-literal.js"

function init() {
  const {
    PKG_VERSION
  } = ESM

  const {
    Error: ExError,
    ReferenceError: ExReferenceError,
    SyntaxError: ExSyntaxError,
    TypeError: ExTypeError
  } = shared.external

  const errors = { __proto__: null }
  const messages = { __proto__: null }

  const truncInspectOptions = {
    depth: 2
  }

  addBuiltinError("ERR_EXPORT_CYCLE", exportCycle, ExSyntaxError)
  addBuiltinError("ERR_EXPORT_MISSING", exportMissing, ExSyntaxError)
  addBuiltinError("ERR_EXPORT_STAR_CONFLICT", exportStarConflict, ExSyntaxError)
  addBuiltinError("ERR_INVALID_ESM_FILE_EXTENSION", invalidExtension, ExError)
  addBuiltinError("ERR_INVALID_ESM_OPTION", invalidPkgOption, ExError)
  addBuiltinError("ERR_NS_ASSIGNMENT", namespaceAssignment, ExTypeError)
  addBuiltinError("ERR_NS_DEFINITION", namespaceDefinition, ExTypeError)
  addBuiltinError("ERR_NS_DELETION", namespaceDeletion, ExTypeError)
  addBuiltinError("ERR_NS_EXTENSION", namespaceExtension, ExTypeError)
  addBuiltinError("ERR_NS_REDEFINITION", namespaceRedefinition, ExTypeError)
  addBuiltinError("ERR_UNDEFINED_IDENTIFIER", undefinedIdentifier, ExReferenceError)
  addBuiltinError("ERR_UNKNOWN_ESM_OPTION", unknownPkgOption, ExError)

  addLegacyError("MODULE_NOT_FOUND", missingCJS, ExError)

  addNodeError("ERR_INVALID_ARG_TYPE", invalidArgType, ExTypeError)
  addNodeError("ERR_INVALID_ARG_VALUE", invalidArgValue, ExError)
  addNodeError("ERR_INVALID_PROTOCOL", invalidProtocol, ExError)
  addNodeError("ERR_MODULE_RESOLUTION_LEGACY", moduleResolutionLegacy, ExError)
  addNodeError("ERR_REQUIRE_ESM", requireESM, ExError)
  addNodeError("ERR_UNKNOWN_FILE_EXTENSION", unknownFileExtension, ExError)

  function addBuiltinError(code, messageHandler, Super) {
    errors[code] = createBuiltinErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function addLegacyError(code, messageHandler, Super) {
    errors[code] = createLegacyErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function addNodeError(code, messageHandler, Super) {
    errors[code] = createNodeErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function createBuiltinErrorClass(Super, code) {
    return function BuiltinError(...args) {
      const { length } = args
      const last = length ? args[length - 1] : null
      const beforeFunc = typeof last === "function" ? args.pop() : null
      const error = new Super(messages[code](...args))

      if (beforeFunc) {
        captureStackTrace(error, beforeFunc)
      }

      const loc = getLocationFromStackTrace(error)

      if (loc) {
        error.stack =
          loc.filename + ":" +
          loc.line + "\n" +
          error.stack
      }

      return error
    }
  }

  function createLegacyErrorClass(Super, code) {
    return class LegacyError extends Super {
      constructor(...args) {
        super(messages[code](...args))
        this.code = code
      }
    }
  }

  function createNodeErrorClass(Super, code) {
    return class NodeError extends Super {
      constructor(...args) {
        super(messages[code](...args))

        if (code === "MODULE_NOT_FOUND") {
          this.code = code
          this.name = super.name
        }
      }

      get code() {
        return code
      }

      set code(value) {
        setProperty(this, "code", value)
      }

      get name() {
        return super.name + " [" + code + "]"
      }

      set name(value) {
        setProperty(this, "name", value)
      }
    }
  }

  function truncInspect(value) {
    const inspected = inspect(value, truncInspectOptions)

    return inspected.length > 128
      ? inspected.slice(0, 128) + "..."
      : inspected
  }

  function exportCycle(request, name) {
    return "Detected cycle while resolving name '" + name +
      "' in ES module: " + getModuleURL(request)
  }

  function exportMissing(request, name) {
    return "Missing export name '" + name +
      "' in ES module: " + getModuleURL(request)
  }

  function exportStarConflict(request, name) {
    return "Conflicting indirect export name '" + name +
      "' in ES module: " + getModuleURL(request)
  }

  function invalidArgType(name, expected, actual) {
    let message = "The '" + name + "' argument must be " + expected

    if (arguments.length > 2) {
      message += ". Received type " + (actual === null ? "null" : typeof actual)
    }

    return message
  }

  function invalidArgValue(name, value, reason = "is invalid") {
    return "The argument '" + name + "' " + reason +
      ". Received " + truncInspect(value)
  }

  function invalidExtension(request) {
    return "Cannot load ES module from .mjs: " + getModuleURL(request)
  }

  function invalidPkgOption(name, value, unquoted) {
    return "The esm@" + PKG_VERSION +
      " option " + (unquoted ? name : toStringLiteral(name, "'")) +
      " is invalid. Received " + truncInspect(value)
  }

  function invalidProtocol(protocol, expected) {
    return "Protocol '" + protocol +
      "' not supported. Expected '" + expected + "'"
  }

  function missingCJS(request) {
    return "Cannot find module " + toStringLiteral(request, "'")
  }

  function moduleResolutionLegacy(id, fromPath, foundPath) {
    return id + " not found by import in " + fromPath +
      ". Legacy behavior in require() would have found it at " + foundPath
  }

  function namespaceAssignment(request, name) {
    return "Cannot assign to read only module namespace property " +
      toStringLiteral(name, "'") + " of " + getModuleURL(request)
  }

  function namespaceDefinition(request, name) {
    return "Cannot define module namespace property " +
      toStringLiteral(name, "'") + " of " + getModuleURL(request)
  }

  function namespaceDeletion(request, name) {
    return "Cannot delete module namespace property " +
      toStringLiteral(name, "'") + " of " + getModuleURL(request)
  }

  function namespaceExtension(request, name) {
    return "Cannot add module namespace property " +
      toStringLiteral(name, "'") + " to " + getModuleURL(request)
  }

  function namespaceRedefinition(request, name) {
    return "Cannot redefine module namespace property " +
      toStringLiteral(name, "'") + " of " + getModuleURL(request)
  }

  function requireESM(request) {
    return "Must use import to load ES module: " + getModuleURL(request)
  }

  function unknownFileExtension(filename) {
    return "Unknown file extension: " + filename
  }

  function unknownPkgOption(name) {
    return "Unknown esm@" + PKG_VERSION + " option: " + name
  }

  function undefinedIdentifier(name) {
    return name + " is not defined"
  }

  return errors
}

export default shared.inited
  ? shared.module.errors
  : shared.module.errors = init()
