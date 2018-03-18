import SafeJSON from "../safe/json.js"

import readFileFast from "../fs/read-file-fast.js"
import { readFileSync } from "../safe/fs.js"
import shared from "../shared.js"
import stripBOM from "../util/strip-bom.js"
import toNamespacedPath from "../path/to-namespaced-path.js"

const extensions = { __proto__: null }

extensions[".js"] = function (mod, filename) {
  mod._compile(stripBOM(readFileSync(filename, "utf8")), filename)
}

extensions[".json"] = function (mod, filename) {
  const content = readFileFast(filename, "utf8")

  try {
    mod.exports = SafeJSON.parse(content)
  } catch (e) {
    e.message = filename + ": " + e.message
    throw e
  }
}

extensions[".node"] = function (mod, filename) {
  return shared.process.dlopen(mod, toNamespacedPath(filename))
}

export default extensions
