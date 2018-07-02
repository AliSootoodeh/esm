import shared from "../shared.js"

function init() {
  function parseJSON(string) {
    try {
      return JSON.parse(string)
    } catch (e) {}

    return null
  }

  return parseJSON
}

export default shared.inited
  ? shared.module.utilParseJSON
  : shared.module.utilParseJSON = init()
