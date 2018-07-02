import isDataDescriptor from "./is-data-descriptor.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function copyProperty(object, source, name) {
    if (! isObjectLike(object) ||
        ! isObjectLike(source)) {
      return object
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(source, name)

    if (descriptor) {
      if (isDataDescriptor(descriptor)) {
        object[name] = source[name]
      } else {
        Reflect.defineProperty(object, name, descriptor)
      }
    }

    return object
  }

  return copyProperty
}

export default shared.inited
  ? shared.module.utilCopyProperty
  : shared.module.utilCopyProperty = init()
