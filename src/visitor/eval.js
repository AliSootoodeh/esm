import Visitor from "../visitor.js"

import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class EvalVisitor extends Visitor {
    reset(rootPath, options) {
      this.addedImportExport = options.addedImportExport
      this.changed = false
      this.magicString = options.magicString
      this.possibleIndexes = options.possibleIndexes
      this.runtimeName = options.runtimeName
      this.strict = options.strict
    }

    visitCallExpression(path) {
      const node = path.getValue()
      const { callee } = node

      if (callee.name !== "eval") {
        this.visitChildren(path)
        return
      }

      if (! node.arguments.length) {
        return
      }

      // Support direct eval:
      // eval(code)
      this.changed = true

      const { end, start } = node
      const { magicString, runtimeName } = this

      const code = this.strict
        ? runtimeName + ".c"
        : "(eval===" + runtimeName + ".v?" + runtimeName + ".c:" + runtimeName + ".k)"

      magicString
        .prependLeft(callee.end, "(" + code)
        .prependLeft(end, ")")

      if (this.addedImportExport) {
        magicString
          .prependLeft(start, runtimeName + ".u(")
          .prependLeft(end, ")")
      }

      path.call(this, "visitWithoutReset", "arguments")
    }

    visitIdentifier(path) {
      const node = path.getValue()

      if (node.name !== "eval") {
        return
      }

      const parent = path.getParentNode()
      const { type } = parent

      if (type === "CallExpression" ||
          (type === "AssignmentExpression" &&
           parent.left === node) ||
          (type === "UnaryExpression" &&
           parent.operator === "typeof") ||
          ! isIdentifer(node, parent) ||
          isShadowed(path, "eval", shadowedMap)) {
        return
      }

      // Support indirect eval:
      // o = { eval }
      // o.e = eval
      // (0, eval)(code)
      this.changed = true

      const { end, start } = node
      const { runtimeName } = this

      const code = this.strict
        ? runtimeName + ".g"
        : "(eval===" + runtimeName + ".v?" + runtimeName + ".g:eval)"

      if (type === "Property" &&
          parent.shorthand) {
        this.magicString.prependLeft(end, ":" + code)
      } else {
        overwrite(this, start, end, code)
      }
    }
  }

  return new EvalVisitor
}

export default shared.inited
  ? shared.module.visitorEval
  : shared.module.visitorEval = init()
