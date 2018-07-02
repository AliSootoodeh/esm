import GenericDate from "../generic/date.js"

import shared from "../shared.js"
import { statSync } from "../safe/fs.js"

function init() {
  const { round } = Math

  function mtime(filename) {
    if (typeof filename === "string") {
      try {
        const stat = statSync(filename)
        const { mtimeMs } = stat

        // Add 0.5 to avoid rounding down.
        // https://github.com/nodejs/node/pull/12607
        return typeof mtimeMs === "number"
          ? round(mtimeMs + 0.5)
          : GenericDate.getTime(stat.mtime)
      } catch (e) {}
    }

    return -1
  }

  return mtime
}

export default shared.inited
  ? shared.module.fsMtime
  : shared.module.fsMtime = init()
