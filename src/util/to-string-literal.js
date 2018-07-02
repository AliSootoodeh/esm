import CHAR_CODE from "../constant/char-code.js"
import shared from "../shared.js"

function init() {
  const {
    QUOTE
  } = CHAR_CODE

  const escapedDoubleQuoteRegExp = /\\"/g

  const escapeRegExpMap = {
    __proto__: null,
    // eslint-disable-next-line sort-keys
    '"': /\\?"/g,
    "'": /\\?'/g,
    "`": /\\?`/g
  }

  const quoteMap = {
    __proto__: null,
    // eslint-disable-next-line sort-keys
    '"': '"',
    "'": "'",
    "`": "`",
    back: "`",
    double: '"',
    single: "'"
  }

  function toStringLiteral(value, style = '"') {
    const quote = quoteMap[style] || '"'
    const string = JSON.stringify(value)

    if (quote === '"' &&
        string.charCodeAt(0) === QUOTE) {
      return string
    }

    const unquoted = string.slice(1, -1)
    const escaped = unquoted.replace(escapedDoubleQuoteRegExp, '"')

    return quote + escaped.replace(escapeRegExpMap[quote], "\\" + quote) + quote
  }

  return toStringLiteral
}

export default shared.inited
  ? shared.module.utilToStringLiteral
  : shared.module.utilToStringLiteral = init()
