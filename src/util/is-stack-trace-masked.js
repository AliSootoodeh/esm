
import isNative from "./is-native.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function isStackTraceMasked(error) {
    const descriptor = isObjectLike(error)
      ? Reflect.getOwnPropertyDescriptor(error, "stack")
      : void 0

    if (descriptor &&
        descriptor.configurable &&
        descriptor.get &&
        descriptor.set &&
        ! descriptor.enumerable &&
        ! isNative(descriptor.get) &&
        ! isNative(descriptor.set)) {
      return true
    }

    return false
  }

  return isStackTraceMasked
}

export default shared.inited
  ? shared.module.utilIsStackTraceMasked
  : shared.module.utilIsStackTraceMasked = init()
