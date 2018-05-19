// A simplified version of file-url.
// Copyright Sindre Sorhus. Released under MIT license:
// https://github.com/sindresorhus/file-url

import CHAR_CODE from "../constant/char-code.js"

import encodeURI from "./encode-uri.js"
import normalize from "../path/normalize.js"
import { resolve } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  const {
    FORWARD_SLASH
  } = CHAR_CODE

  const encodeCharsRegExp = /[?#]/g

  const encodeCharMap = {
    "#": "%23",
    "?": "%3F"
  }

  function encodeChar(char) {
    return encodeCharMap[char]
  }

  function getURLFromFilePath(filename) {
    filename = typeof filename === "string"
      ? normalize(resolve(filename))
      : ""

    if (filename.charCodeAt(0) !== FORWARD_SLASH) {
      filename = "/" + filename
    }

    // Section 3.3: Escape Path Components
    // https://tools.ietf.org/html/rfc3986#section-3.3
    const encoded = encodeURI(filename)

    return "file://" + encoded.replace(encodeCharsRegExp, encodeChar)
  }

  return getURLFromFilePath
}

export default shared.inited
  ? shared.module.utilGetURLFromFilePath
  : shared.module.utilGetURLFromFilePath = init()
