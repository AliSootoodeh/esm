import assert from "assert"
import execa from "execa"
import path from "path"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const NODE_BIN = path.resolve(__dirname, "env/prefix", isWin ? "node.exe" : "bin/node")

const dirnameURL = "file://" + (isWin ? "/" : "") + __dirname.replace(/\\/g, "/")

describe("command-line hook", () => {
  it("should not fail on unresolvable command-line arguments", () => {
    const args = [
      "./node_modules/cli",
      "UNRESOLVABLE_VALUE",
      "../index.js"
    ]

    return execa(NODE_BIN, args, {
      cwd: __dirname,
      reject: false
    })
    .then((result) => assert.strictEqual(result.stderr, ""))
  })

  it("should inspect JSON encoded command-line arguments", () => {
    const args = [
      "./node_modules/cli",
      '{"r":"../index.js"}'
    ]

    return execa(NODE_BIN, args, {
      cwd: __dirname,
      reject: false
    })
    .then((result) => {
      const url = dirnameURL + "/fixture/main.mjs"
      const expected = { default: { url } }

      const jsonText = result
        .stdout
        .split("\n")
        .reverse()
        .find((line) => line.startsWith("{"))

      const exported = jsonText
        ? JSON.parse(jsonText)
        : {}

      assert.deepStrictEqual(exported, expected)
    })
  })
})
