// A more accurate version of the dynamic import acorn plugin.
// Copyright Jordan Gensler. Released under MIT license:
// https://github.com/kesne/acorn-dynamic-import

import lookahead from "../parse/lookahead.js"
import { types as tt } from "../vendor/acorn/src/tokentype.js"
import wrap from "../util/wrap.js"

function enable(parser) {
  // Allow `yield import()` to parse.
  tt._import.startsExpr = true
  parser.parseExprAtom = wrap(parser.parseExprAtom, parseExprAtom)
  parser.parseStatement = wrap(parser.parseStatement, parseStatement)
  return parser
}

function parseExprAtom(func, args) {
  if (this.type === tt._import) {
    const { type } = lookahead(this)

    if (type === tt.dot) {
      return parseImportMetaPropertyAtom(this)
    }

    if (type === tt.parenL) {
      return parseImportCallAtom(this)
    }

    this.unexpected()
  }

  return func.apply(this, args)
}

function parseStatement(func, args) {
  if (this.type === tt._import) {
    const { type } = lookahead(this)

    if (type === tt.dot) {
      // import.meta
      // https://tc39.github.io/proposal-import-meta/#prod-ImportMeta
      return parseImportMetaProperty(this)
    }

    if (type === tt.parenL) {
      // import(...)
      // https://tc39.github.io/proposal-dynamic-import/#prod-ImportCall
      return parseImportCall(this)
    }
  }

  return func.apply(this, args)
}

function parseImportCall(parser) {
  const node = parser.startNode()
  const { start } = parser

  const callExpr = parser.startNode()
  const callee = parser.parseExprAtom()

  parser.expect(tt.parenL)

  callExpr.arguments = [parser.parseMaybeAssign()]
  callExpr.callee = callee
  parser.finishNode(callExpr, "CallExpression")

  parser.expect(tt.parenR)

  const expr = parser.parseSubscripts(callExpr, start)
  return parser.parseExpressionStatement(node, expr)
}

function parseImportMetaProperty(parser) {
  const node = parser.startNode()
  const expr = parser.parseMaybeAssign()
  return parser.parseExpressionStatement(node, expr)
}

function parseImportCallAtom(parser) {
  const node = parser.startNode()
  parser.expect(tt._import)
  return parser.finishNode(node, "Import")
}

function parseImportMetaPropertyAtom(parser) {
  // The meta property code is adapted from Babylon.
  // Copyright Babylon contributors. Released under MIT license:
  // https://github.com/babel/babylon/blob/master/src/parser/expression.js
  const node = parser.startNode()
  const meta = parser.parseIdent(true)

  parser.expect(tt.dot)

  node.meta = meta
  node.property = parser.parseIdent(true)

  if (node.property.name !== "meta") {
    parser.raise(node.property.start, "The only valid meta property for 'import' is 'import.meta'")
  } else if (! parser.inModule) {
    parser.raise(meta.start, "'import.meta' may only be used in ES modules")
  }

  return parser.finishNode(node, "MetaProperty")
}

export { enable }
