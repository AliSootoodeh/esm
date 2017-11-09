import Entry from "./entry.js"
import FastObject from "./fast-object.js"

import builtinModules from "./builtin-modules.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"

const builtinEntries = Object.keys(builtinModules)
  .reduce((object, id) => {
    setGetter(object, id, () => {
      return object[id] = Entry.get(builtinModules[id])
    })

    setSetter(object, id, (value) => {
      setProperty(object, id, { value })
    })

    return object
  }, new FastObject)

export default builtinEntries
