import OwnProxy from "../own/proxy.js"
import Package from "../package.js"

import copyProperty from "./copy-property.js"
import has from "./has.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"
import shimFunctionPrototypeToString from "../shim/function-prototype-to-string.js"
import unwrapProxy from "./unwrap-proxy.js"

function maskFunction(func, source) {
  if (typeof source !== "function") {
    return func
  }

  const cache = shared.memoize.utilMaskFunction

  let cached = cache.get(func)

  if (cached) {
    return cached.proxy
  }

  const proxy = new OwnProxy(func, {
    get(target, name, receiver) {
      if (name === "toString" &&
          ! has(target, "toString")) {
        return cached.toString
      }

      if (receiver === proxy) {
        receiver = target
      }

      return Reflect.get(target, name, receiver)
    }
  })

  const toString = new OwnProxy(func.toString, {
    apply(target, thisArg, args) {
      if (! Package.state.default.options.debug &&
          typeof thisArg === "function" &&
          unwrapProxy(thisArg) === func) {
        thisArg = cached.source
      }

      return Reflect.apply(target, thisArg, args)
    }
  })

  source = cache.get(source) || source

  if (typeof source !== "function") {
    source = source.source
  }

  copyProperty(func, source, "name")
  Reflect.setPrototypeOf(func, Reflect.getPrototypeOf(source))

  const proto = has(func, "prototype") ? func.prototype : void 0
  const sourceProto = has(source, "prototype") ? source.prototype : void 0

  if (isObjectLike(proto) &&
      isObjectLike(sourceProto)) {
    Reflect.setPrototypeOf(proto, Reflect.getPrototypeOf(sourceProto))
  } else {
    const descriptor = Reflect.getOwnPropertyDescriptor(source, "prototype")

    if (descriptor) {
      Reflect.defineProperty(func, "prototype", descriptor)
    } else {
      Reflect.deleteProperty(func, "prototype")
    }
  }

  cached = {
    proxy,
    source,
    toString
  }

  cache
    .set(func, cached)
    .set(proxy, cached)

  return proxy
}

shimFunctionPrototypeToString.enable(shared.safeGlobal)

export default maskFunction
