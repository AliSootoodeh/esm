import assert from "assert"
import require from "./require.js"

describe("file extension", () => {
  it("should not error loading extensionless files with `require`", () => {
    require("./fixture/ext/no-ext-cjs")
  })

  it("should not error loading unknown extensions with `require`", () => {
    require("./fixture/ext/a.js.unknown")
  })

  it("should error loading extensionless files with dynamic import in CJS", () =>
    import("./ext/no-ext.js")
      .then((ns) => ns.default())
  )

  it("should not error loading extensionless files with dynamic import in CJS with `options.cjs.paths`", () =>
    import("./cjs/ext/no-ext.js")
      .then((ns) => ns.default())
  )

  it("should error loading extensionless files with dynamic import in ESM", () =>
    import("./fixture/ext/no-ext-esm")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_UNKNOWN_FILE_EXTENSION"))
  )

  it("should error loading extensionless files with dynamic import in ESM with `options.cjs.paths`", () =>
    import("./cjs/ext/no-ext.mjs")
      .then((ns) => ns.default())
  )

  it("should error loading unknown extensions with dynamic import in CJS", () =>
    import("./ext/unknown.js")
      .then((ns) => ns.default())
  )

  it("should not error loading unknown extensions with dynamic import in CJS with `options.cjs.paths`", () =>
    import("./cjs/ext/unknown.js")
      .then((ns) => ns.default())
  )

  it("should error loading unknown extensions with dynamic import in ESM", () =>
    import("./fixture/ext/a.mjs.unknown")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_UNKNOWN_FILE_EXTENSION"))
  )

  it("should error loading unknown extensions with dynamic import in ESM with `options.cjs.paths`", () =>
    import("./cjs/ext/unknown.mjs")
      .then((ns) => ns.default())
  )

  it('should error loading non `.mjs` ES modules from `.mjs` files with `options.mode` of "strict"', () =>
    Promise
      .all([
        "./fixture/ext/invalid-ext.js",
        "./fixture/ext/invalid-ext.mjs"
      ]
      .map((request) =>
        import(request)
          .then(() => assert.ok(false))
          .catch((e) => {
            assert.ok(e.message.includes("'import' and 'export' may only be used in ES modules"))
          })
      ))
  )

  it('should error loading non `.mjs` ES modules from `.mjs` files with `options.mode` of "auto"', () =>
    Promise
      .all([
        "./fixture/cjs/ext/invalid-ext.js",
        "./fixture/cjs/ext/invalid-ext.mjs"
      ]
      .map((request) =>
        import(request)
          .then(() => assert.ok(false))
          .catch((e) => {
            assert.ok(e.message.includes("cannot be loaded from .mjs files"))
          })
      ))
  )
})
