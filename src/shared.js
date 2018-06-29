import ESM from "./constant/esm.js"

import encodeId from "./util/encode-id.js"
import setDeferred from "./util/set-deferred.js"

const {
  PKG_PREFIX,
  PKG_VERSION
} = ESM

const SHARED_SYMBOL = Symbol.for(PKG_PREFIX + "@" + PKG_VERSION + ":shared")

function getShared() {
  if (__shared__) {
    __shared__.inited = true
    __shared__.reloaded = false
    return __shared__
  }

  try {
    const shared = __non_webpack_require__(SHARED_SYMBOL)

    shared.reloaded = true

    // eslint-disable-next-line no-global-assign
    return __shared__ = shared
  } catch (e) {}

  return init()
}

function init() {
  const dummyProxy = new Proxy(class P {}, {
    [PKG_PREFIX]: 1
  })

  const funcToString = Function.prototype.toString
  const { toString } = Object.prototype

  const fastPath = {}
  const utilBinding = {}

  const support = {
    wasm: typeof WebAssembly === "object" && WebAssembly !== null
  }

  const symbol = {
    _compile: Symbol.for(PKG_PREFIX + ":module._compile"),
    mjs: Symbol.for(PKG_PREFIX + ':Module._extensions[".mjs"]'),
    namespace: Symbol.for(PKG_PREFIX + ":namespace"),
    package: Symbol.for(PKG_PREFIX + ":package"),
    realGetProxyDetails: Symbol.for(PKG_PREFIX + ":realGetProxyDetails"),
    realRequire: Symbol.for(PKG_PREFIX + ":realRequire"),
    shared: SHARED_SYMBOL,
    wrapper: Symbol.for(PKG_PREFIX + ":wrapper")
  }

  const shared = {
    entry: {
      cache: new WeakMap,
      skipExports: { __proto__: null }
    },
    env: {},
    external: __external__,
    fastPath,
    inited: false,
    memoize: {
      builtinEntries: { __proto__: null },
      builtinModules: { __proto__: null },
      moduleCJSResolveFilename: { __proto__: null },
      moduleESMResolveFilename: { __proto__: null },
      moduleFindPath: { __proto__: null },
      moduleReadPackage: { __proto__: null },
      pathDirname: { __proto__: null },
      pathExtname: { __proto__: null },
      shimFunctionPrototypeToString: new WeakMap,
      shimProcessBindingUtilGetProxyDetails: new WeakMap,
      utilGetProxyDetails: new WeakMap,
      utilMaskFunction: new WeakMap,
      utilMaxSatisfying: { __proto__: null },
      utilParseURL: { __proto__: null },
      utilProxyExports: new WeakMap,
      utilSatisfies: { __proto__: null },
      utilUnwrapProxy: new WeakMap
    },
    module: {},
    moduleState: {
      parseOnly: false,
      parsing: false,
      requireDepth: 0,
      stat: null
    },
    package: {
      default: null,
      dir: { __proto__: null },
      root: { __proto__: null },
      state: { __proto__: null }
    },
    pendingScripts: { __proto__: null },
    pendingWrites: { __proto__: null },
    reloaded: false,
    safeGlobal: Function("return this")(),
    support,
    symbol,
    unsafeGlobal: global,
    utilBinding
  }

  setDeferred(shared, "circularErrorMessage", () => {
    try {
      const object = {}

      object.a = object
      JSON.stringify(object)
    } catch ({ message }) {
      return message
    }
  })

  setDeferred(shared, "customInspectKey", () => {
    const { customInspectSymbol } = shared.module.safeUtil

    return typeof customInspectSymbol === "symbol"
      ? customInspectSymbol
      : "inspect"
  })

  setDeferred(shared, "defaultGlobal", () => {
    const script = new shared.module.safeVM.Script("this")

    return script.runInThisContext()
  })

  setDeferred(shared, "proxyNativeSourceText", () => {
    try {
      return funcToString.call(dummyProxy)
    } catch (e) {}

    return ""
  })

  setDeferred(shared, "runtimeName", () => {
    return encodeId(
      "_" +
      shared.module.safeCrypto.createHash("md5")
        .update(Date.now().toString())
        .digest("hex")
        .slice(0, 3)
    )
  })

  setDeferred(shared, "unsafeContext", () => {
    return shared.module.safeVM.createContext(shared.unsafeGlobal)
  })

  setDeferred(fastPath, "readFile", () => {
    return support.internalModuleReadFile
  })

  setDeferred(fastPath, "readFileFast", () => {
    return support.internalModuleReadJSON ||
      support.internalModuleReadFile
  })

  setDeferred(fastPath, "stat", () => {
    return typeof shared.module.binding.fs.internalModuleStat === "function"
  })

  setDeferred(support, "await", () => {
    try {
      Function("async()=>await 1")()
      return true
    } catch (e) {}

    return false
  })

  setDeferred(support, "createCachedData", () => {
    return typeof shared.module.safeVM.Script.prototype.createCachedData === "function"
  })

  setDeferred(support, "getProxyDetails", () => {
    return typeof shared.module.binding.util.getProxyDetails === "function"
  })

  setDeferred(support, "inspectProxies", () => {
    const inspected = shared.module.safeUtil.inspect(dummyProxy, {
      depth: 1,
      showProxy: true
    })

    return inspected.startsWith("Proxy") &&
      inspected.indexOf(PKG_PREFIX) !== -1
  })

  setDeferred(support, "internalModuleReadFile", () => {
    return typeof shared.module.binding.fs.internalModuleReadFile === "function"
  })

  setDeferred(support, "internalModuleReadJSON", () => {
    return typeof shared.module.binding.fs.internalModuleReadJSON === "function"
  })

  setDeferred(support, "lookupShadowed", () => {
    // Node < 8 will lookup accessors in the prototype chain despite being
    // shadowed by data properties.
    // https://node.green/#ES2017-annex-b
    const object = {
      __proto__: {
        // eslint-disable-next-line getter-return
        get a() {},
        set a(v) {}
      },
      a: 1
    }

    return ! object.__lookupGetter__("a") &&
      ! object.__lookupSetter__("a")
  })

  setDeferred(support, "nativeProxyReceiver", () => {
    // Detect support for invoking native functions with a proxy receiver.
    // https://bugs.chromium.org/p/v8/issues/detail?id=5773
    try {
      return new Proxy(shared.module.SafeBuffer.alloc(0), {
        get: (target, name) => target[name]
      }).toString() === ""
    } catch (e) {
      return ! /Illegal/.test(e)
    }
  })

  setDeferred(support, "proxiedClasses", () => {
    class C extends dummyProxy {
      c() {}
    }

    return new C().c !== void 0
  })

  setDeferred(support, "proxiedFunctionToStringTag", () => {
    return toString.call(dummyProxy) === "[object Function]"
  })

  setDeferred(support, "replShowProxy", () => {
    const { safeProcess, utilSatisfies } = shared.module

    return utilSatisfies(safeProcess.version, ">=10")
  })

  setDeferred(support, "safeGetEnv", () => {
    return typeof shared.module.binding.util.safeGetenv === "function"
  })

  setDeferred(support, "setHiddenValue", () => {
    return typeof shared.module.binding.util.setHiddenValue === "function"
  })

  setDeferred(utilBinding, "errorDecoratedSymbol", () => {
    const { binding, safeProcess, utilSatisfies } = shared.module

    return utilSatisfies(safeProcess.version, "<7")
      ? "node:decorated"
      : binding.util.decorated_private_symbol
  })

  setDeferred(utilBinding, "hiddenKeyType", () => {
    const { safeProcess, utilSatisfies } = shared.module

    return utilSatisfies(safeProcess.version, "<7")
      ? "string"
      : typeof utilBinding.errorDecoratedSymbol
  })

  // eslint-disable-next-line no-global-assign
  return __shared__ = shared
}

export default getShared()
