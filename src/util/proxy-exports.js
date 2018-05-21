import OwnProxy from "../own/proxy.js"
import SafeObject from "../safe/object.js"

import getGetter from "./get-getter.js"
import getSetter from "./get-setter.js"
import isAnyArrayBuffer from "./is-any-array-buffer.js"
import isDate from "./is-date.js"
import isExternal from "./is-external.js"
import isMap from "./is-map.js"
import isMapIterator from "./is-map-iterator.js"
import isNative from "./is-native.js"
import isNumberObject from "./is-number-object.js"
import isObjectLike from "./is-object-like.js"
import isPlainObject from "./is-plain-object.js"
import isRegExp from "./is-regexp.js"
import isSet from "./is-set.js"
import isSetIterator from "./is-set-iterator.js"
import isStringObject from "./is-string-object.js"
import isWeakMap from "./is-weak-map.js"
import isWebAssemblyCompiledModule from "./is-web-assembly-compiled-module.js"
import keys from "./keys.js"
import shared from "../shared.js"

function init() {
  const { toString } = Object.prototype

  function proxyExports(entry) {
    const exported = entry.exports

    if (! shared.support.proxiedClasses ||
        ! isObjectLike(exported)) {
      return exported
    }

    const cache = shared.memoize.utilProxyExports

    let cached = cache.get(exported)

    if (cached) {
      return cached.proxy
    }

    const get = (target, name, receiver) => {
      const accessor = getGetter(target, name)
      const value = Reflect.get(target, name, receiver)

      if (accessor) {
        tryUpdate(name, value)
      }

      return value
    }

    const maybeWrap = (target, name, value) => {
      // Wrap native methods to avoid throwing illegal invocation or
      // incompatible receiver type errors.
      if (! isNative(value)) {
        return value
      }

      let wrapper = cached.wrap.get(value)

      if (wrapper) {
        return wrapper
      }

      wrapper = new OwnProxy(value, {
        apply(funcTarget, thisArg, args) {
          // Check for `entry.esmNamespace` because it's a proxy that native
          // methods could be invoked on.
          if (thisArg === proxy ||
              thisArg === entry.esmNamespace) {
            thisArg = target
          }

          return Reflect.apply(value, thisArg, args)
        }
      })

      cached.wrap.set(value, wrapper)
      cached.unwrap.set(wrapper, value)

      return wrapper
    }

    const tryUpdate = (name, value) => {
      if (! Reflect.has(entry._namespace, name)) {
        entry.update()
        return
      }

      const { getters } = entry
      const getter = getters[name]

      entry.addGetter(name, () => value)

      try {
        entry.update(name)
      } finally {
        if (getter) {
          getters[name] = getter
        } else {
          Reflect.deleteProperty(getters, name)
        }
      }
    }

    const handler = {
      defineProperty(target, name, descriptor) {
        const { value } = descriptor

        if (typeof value === "function") {
          descriptor.value = cached.unwrap.get(value) || value
        }

        // Use `Object.defineProperty` instead of `Reflect.defineProperty` to
        // throw the appropriate error if something goes wrong.
        // https://tc39.github.io/ecma262/#sec-definepropertyorthrow
        SafeObject.defineProperty(target, name, descriptor)

        if (descriptor.get &&
            ! handler.get) {
          handler.get = get
        }

        if (Reflect.has(entry._namespace, name)) {
          entry.update(name)
        }

        return true
      },
      deleteProperty(target, name) {
        if (Reflect.deleteProperty(target, name)) {
          if (Reflect.has(entry._namespace, name)) {
            entry.update(name)
          }

          return true
        }

        return false
      },
      set(target, name, value, receiver) {
        if (typeof value === "function") {
          value = cached.unwrap.get(value) || value
        }

        const accessor = getSetter(target, name)

        if (Reflect.set(target, name, value, receiver)) {
          if (accessor) {
            entry.update()
          } else if (Reflect.has(entry._namespace, name)) {
            entry.update(name)
          }
          return true
        }

        return false
      }
    }

    const { builtin } = entry
    const names = builtin ? null : keys(exported)

    for (const name of names) {
      const descriptor = Reflect.getOwnPropertyDescriptor(exported, name)

      if (descriptor &&
          descriptor.get) {
        handler.get = get
        break
      }
    }

    let useWrappers = ! shared.support.nativeProxyReceiver

    if (builtin) {
      if (typeof exported === "function" ||
          Reflect.has(exported, Symbol.toStringTag) ||
          toString.call(exported) === "[object Object]") {
        useWrappers = false
      } else {
        useWrappers = true
      }
    } else if (! useWrappers) {
      if (typeof exported === "function") {
        useWrappers = isNative(exported)
      } else if (! isPlainObject(exported)) {
        useWrappers =
          isMap(exported) ||
          isSet(exported) ||
          isWeakMap(exported) ||
          isDate(exported) ||
          isRegExp(exported) ||
          ArrayBuffer.isView(exported) ||
          isAnyArrayBuffer(exported) ||
          isNumberObject(exported) ||
          isStringObject(exported) ||
          isMapIterator(exported) ||
          isSetIterator(exported) ||
          isWebAssemblyCompiledModule(exported) ||
          isExternal(exported)
      }
    }

    if (useWrappers) {
      handler.get = (target, name, receiver) => {
        const value = get(target, name, receiver)

        // Produce a `Symbol.toStringTag` value, otherwise
        // `Object.prototype.toString.call(proxy)` will return
        // "[object Function]", if `proxy` is a function, else "[object Object]".
        if (name === Symbol.toStringTag &&
            typeof target !== "function" &&
            typeof value !== "string") {
          // Section 19.1.3.6: Object.prototype.toString()
          // Step 16: If `Type(tag)` is not `String`, let `tag` be `builtinTag`.
          // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
          const toStringTag = toString.call(target).slice(8, -1)

          return toStringTag === "Object" ? value : toStringTag
        }

        return maybeWrap(target, name, value)
      }

      handler.getOwnPropertyDescriptor = (target, name) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

        if (descriptor) {
          const { value } = descriptor

          if (typeof value === "function") {
            descriptor.value = maybeWrap(target, name, value)
          }
        }

        return descriptor
      }
    }

    // Once V8 issue #5773 is fixed, the `getOwnPropertyDescriptor` trap can be
    // removed and the `get` trap can be conditionally dropped for `exported`
    // values that return "[object Function]" or "[object Object]" from
    // `Object.prototype.toString.call(exported)`.
    const proxy = new OwnProxy(exported, handler)

    cached = {
      proxy,
      unwrap: new WeakMap,
      wrap: new WeakMap
    }

    cache
      .set(exported, cached)
      .set(proxy, cached)

    return proxy
  }

  return proxyExports
}

export default shared.inited
  ? shared.module.utilProxyExports
  : shared.module.utilProxyExports = init()
