import Visitor from "../visitor.js"

import isIdentifer from "../parse/is-identifier.js"
import isShadowed from "../parse/is-shadowed.js"
import maybeIdentifier from "../parse/maybe-identifier.js"
import overwrite from "../parse/overwrite.js"
import shared from "../shared.js"

function init() {
  const shadowedMap = new Map

  class ArgumentsVisitor extends Visitor {
    reset(options) {
      this.changed = false
      this.magicString = null
      this.possibleIndexes = null
      this.runtimeName = null
      this.top = null

      if (options) {
        this.magicString = options.magicString
        this.possibleIndexes = options.possibleIndexes
        this.runtimeName = options.runtimeName
        this.top = options.top
      }
    }

    visitIdentifier(path) {
      const node = path.getValue()
      const { name } = node
      const isArguments = name === "arguments"

      if (! isArguments &&
          name !== "__dirname" &&
          name !== "__filename" &&
          name !== "exports" &&
          name !== "module" &&
          name !== "require") {
        return
      }

      const parent = path.getParentNode()
      const { runtimeName } = this
      const { type } = parent

      const isTypeOf =
        type === "UnaryExpression" &&
        parent.operator === "typeof"

      if (isArguments &&
          isTypeOf &&
          ! isShadowed(path, name, shadowedMap)) {
        this.changed = true
        overwrite(this, node.start, node.end, "void " + runtimeName)
        return
      }

      if (isTypeOf ||
          ! isIdentifer(node, parent) ||
          isShadowed(path, name, shadowedMap)) {
        return
      }

      maybeIdentifier(path, (node, parent) => {
        this.changed = true

        const { end, start } = node

        if (parent.shorthand) {
          this.magicString
            .prependLeft(
              end,
              ":" + runtimeName + '.t("' + name + '")'
            )

          return
        }

        let prefix
        let postfix

        if (parent.type === "NewExpression") {
          prefix = "("
          postfix = ")"
        } else {
          prefix =
          postfix = ""
        }

        overwrite(
          this,
          start,
          end,
          prefix + runtimeName + '.t("' + name + '")' + postfix
        )
      })
    }
  }

  return new ArgumentsVisitor
}

export default shared.inited
  ? shared.module.visitorArguments
  : shared.module.visitorArguments = init()
