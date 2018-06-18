import { defaultInspectOptions, inspect as safeInspect } from "../safe/util.js"

import GenericFunction from "../generic/function.js"
import OwnProxy from "../own/proxy.js"

import assign from "./assign.js"
import builtinEntries from "../builtin-entries.js"
import getProxyDetails from "./get-proxy-details.js"
import has from "./has.js"
import isModuleNamespaceObject from "./is-module-namespace-object.js"
import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import isProxy from "./is-proxy.js"
import isUpdatableDescriptor from "./is-updatable-descriptor.js"
import isUpdatableGet from "./is-updatable-get.js"
import realUtil from "../real/util.js"
import shared from "../shared.js"
import toNamespaceObject from "./to-namespace-object.js"

function init() {
  let exportedInspect

  const nonWhitespaceRegExp = /\S/

  const uninitializedValue = {
    [shared.customInspectKey]: (recurseTimes, context) => {
      return context.stylize("<uninitialized>", "special")
    }
  }

  function inspect(...args) {
    let [value, options, depth] = args

    if (! isObjectLike(value)) {
      return Reflect.apply(safeInspect, this, args)
    }

    options = typeof options === "boolean"
      ? { showHidden: true }
      : assign({}, options)

    const customInspect = has(options, "customInspect")
      ? options.customInspect
      : defaultInspectOptions.customInspect

    const showProxy = has(options, "showProxy")
      ? options.showProxy
      : defaultInspectOptions.showProxy

    options.customInspect = true
    options.showProxy = false

    if (depth !== void 0 &&
        ! has(options, "depth")) {
      options.depth = depth
    }

    args[0] = wrap(value, options, customInspect, showProxy)
    args[1] = options
    return Reflect.apply(safeInspect, this, args)
  }

  function formatNamespaceObject(namespace, context) {
    const object = toNamespaceObject()
    const names = Object.getOwnPropertyNames(namespace)

    for (const name of names) {
      try {
        object[name] = namespace[name]
      } catch (e) {
        object[name] = uninitializedValue
      }
    }

    const result = inspect(object, context)
    const indentation = result.slice(0, result.search(nonWhitespaceRegExp))
    const trimmed = result.slice(result.indexOf("{"), result.lastIndexOf("}") + 1)

    return indentation + "[Module] " + trimmed
  }

  function formatProxy(proxy, context) {
    const details = getProxyDetails(proxy)

    let object = proxy

    if (details) {
      object = new Proxy(
        toInspectable(details[0], context),
        toInspectable(details[1], context)
      )
    }

    const contextAsOptions = assign({}, context)

    contextAsOptions.customInspect = true
    return safeInspect(object, contextAsOptions)
  }

  function getExportedInspect() {
    if (exportedInspect) {
      return exportedInspect
    }

    return exportedInspect = builtinEntries.util.module.exports.inspect
  }

  function toInspectable(target, options) {
    return {
      [shared.customInspectKey]: (recurseTimes) => {
        const contextAsOptions = assign({}, options)

        contextAsOptions.depth = recurseTimes
        return inspect(target, contextAsOptions)
      }
    }
  }

  function wrap(target, options, customInspect, showProxy) {
    let inspecting = false

    const proxy = new OwnProxy(target, {
      get: (target, name, receiver) => {
        if (receiver === proxy) {
          receiver = target
        }

        const { customInspectKey } = shared
        const value = Reflect.get(target, name, receiver)

        let newValue = value

        if ((name === customInspectKey ||
             name === "inspect") &&
            value === getExportedInspect()) {
          newValue = realUtil.inspect
        } else if (inspecting ||
            name !== customInspectKey) {
          if (name === "toString" &&
              typeof value === "function") {
            newValue = GenericFunction.bind(value, target)
          } else {
            return value
          }
        } else {
          newValue = (...args) => {
            inspecting = true

            let [recurseTimes, context] = args

            const contextAsOptions = assign({}, context)

            contextAsOptions.customInspect = customInspect
            contextAsOptions.showProxy = showProxy
            contextAsOptions.depth = recurseTimes

            try {
              if (target === uninitializedValue) {
                return Reflect.apply(value, target, [recurseTimes, contextAsOptions])
              }

              if (isModuleNamespaceObject(target)) {
                return formatNamespaceObject(target, contextAsOptions)
              }

              if (! showProxy ||
                  ! isProxy(target) ||
                  isOwnProxy(target)) {
                if (typeof value !== "function") {
                  contextAsOptions.customInspect = true
                }

                contextAsOptions.showProxy = false
                return safeInspect(proxy, contextAsOptions)
              }

              return formatProxy(target, contextAsOptions)
            } finally {
              inspecting = false
            }
          }
        }

        if (newValue !== value &&
            isUpdatableGet(target, name)) {
          return newValue
        }

        return value
      },

      getOwnPropertyDescriptor: (target, name) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (isUpdatableDescriptor(descriptor)) {
          const { value } = descriptor

          if (isObjectLike(value)) {
            descriptor.value = wrap(value, options, customInspect, showProxy)
          }
        }

        return descriptor
      }
    })

    return proxy
  }

  return inspect
}

export default shared.inited
  ? shared.module.utilInspect
  : shared.module.utilInspect = init()
