import assert from "assert"

describe("setters", () => {
  it("should be called after eval(...)", () =>
    import("./setter/eval.mjs")
      .then((ns) => ns.default())
  )

  it("should be called for untouched CJS modules", () =>
    import("./setter/untouched")
      .then((ns) => ns.default())
  )
})

describe("bridge modules", () => {
  it("should not prematurely seal star exports", () =>
    import("./setter/seal.mjs")
      .then((ns) => ns.default())
  )
})

describe("parent setters", () => {
  it("should be run when children update exports", () =>
    import("./setter/children.mjs")
      .then((ns) => ns.default())
  )
})
