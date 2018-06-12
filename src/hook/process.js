import ESM from "../constant/esm.js"

import Package from "../package.js"
import Wrapper from "../wrapper.js"

import isError from "../util/is-error.js"
import isStackTraceMasked from "../util/is-stack-trace-masked.js"
import maskStackTrace from "../error/mask-stack-trace.js"
import scrubStackTrace from "../error/scrub-stack-trace.js"

const {
  PKG_VERSION
} = ESM

function hook(process) {
  function exceptionManagerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(process, "_fatalException", PKG_VERSION)

    return wrapped
      ? Reflect.apply(wrapped, this, [manager, func, args])
      : Reflect.apply(func, this, args)
  }

  function exceptionMethodWrapper(manager, func, args) {
    const [error] = args

    if (! Package.state.default.options.debug &&
        isError(error) &&
        ! isStackTraceMasked(error)) {
      maskStackTrace(error)
    }

    return Reflect.apply(func, this, args)
  }

  function warningManagerWrapper(manager, func, args) {
    const wrapped = Wrapper.find(process, "emitWarning", PKG_VERSION)

    return wrapped
      ? Reflect.apply(wrapped, this, [manager, func, args])
      : Reflect.apply(func, this, args)
  }

  function warningMethodWrapper(manager, func, args) {
    const [stack] = args

    if (typeof stack === "string") {
      args[0] = scrubStackTrace(stack)
    }

    return Reflect.apply(func, this, args)
  }

  Wrapper.manage(process, "_fatalException", exceptionManagerWrapper)
  Wrapper.wrap(process, "_fatalException", exceptionMethodWrapper)

  Wrapper.manage(process, "emitWarning", warningManagerWrapper)
  Wrapper.wrap(process, "emitWarning", warningMethodWrapper)
}

export default hook
