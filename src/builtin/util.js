import GenericObject from "../generic/object.js"

import copyProperty from "../util/copy-property.js"
import format from "../util/format.js"
import formatWithOptions from "../util/format-with-options.js"
import inspect from "../util/inspect.js"
import isModuleNamespaceObject from "../util/is-module-namespace-object.js"
import isOwnProxy from "../util/is-own-proxy.js"
import keysAll from "../util/keys-all.js"
import proxyWrap from "../util/proxy-wrap.js"
import realUtil from "../real/util.js"
import safeUtil from "../safe/util.js"
import shared from "../shared.js"
import toWrapper from "../util/to-wrapper.js"

function init() {
  const safeTypes = safeUtil.types

  let builtinTypes

  if (safeTypes) {
    const builtinIsModuleNamespaceObject =
      proxyWrap(safeTypes.isModuleNamespaceObject, toWrapper(isModuleNamespaceObject))

    const builtinIsProxy = proxyWrap(safeTypes.isProxy, (func, [value]) => {
      return func(value) &&
        ! isOwnProxy(value)
    })

    builtinTypes = GenericObject.create()

    const names = keysAll(safeTypes)

    for (const name of names) {
      if (name === "isModuleNamespaceObject") {
        builtinTypes.isModuleNamespaceObject = builtinIsModuleNamespaceObject
      } else if (name === "isProxy") {
        builtinTypes.isProxy = builtinIsProxy
      } else {
        copyProperty(builtinTypes, safeTypes, name)
      }
    }
  }

  const builtinFormat = proxyWrap(safeUtil.format, toWrapper(format))
  const builtinInspect = proxyWrap(safeUtil.inspect, toWrapper(inspect))
  const safeFormatWithOptions = safeUtil.formatWithOptions

  const builtinFormatWithOptions = safeFormatWithOptions
    ? proxyWrap(safeFormatWithOptions, toWrapper(formatWithOptions))
    : formatWithOptions

  const builtinUtil = GenericObject.create()
  const names = keysAll(realUtil)

  for (const name of names) {
    if (name === "format") {
      builtinUtil.format = builtinFormat
    } else if (name === "formatWithOptions") {
      builtinUtil.formatWithOptions = builtinFormatWithOptions
    } else if (name === "inspect") {
      builtinUtil.inspect =
      shared.module.utilInspect = builtinInspect
    } else if (name === "types") {
      builtinUtil.types = builtinTypes
    } else {
      copyProperty(builtinUtil, safeUtil, name)
    }
  }

  return builtinUtil
}

export default shared.inited
  ? shared.module.builtinUtil
  : shared.module.builtinUtil = init()
