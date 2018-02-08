// Based on Acorn's Parser.prototype.strictDirective parser utility.
// Copyright Marijn Haverbeke. Released under MIT license:
// https://github.com/ternjs/acorn/blob/5.1.1/src/parseutil.js#L9-L19

import { skipWhiteSpace } from "../vendor/acorn/src/whitespace.js"

const literalRegExp = /^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)"|;)/

function indexOfPragma(code, pragma) {
  let pos = 0

  while (true) {
    skipWhiteSpace.lastIndex = pos
    pos += skipWhiteSpace.exec(code)[0].length

    const match = literalRegExp.exec(code.slice(pos))

    if (match === null) {
      return -1
    }

    if ((match[1] || match[2]) === pragma) {
      return pos
    }

    pos += match[0].length
  }
}

export default indexOfPragma
