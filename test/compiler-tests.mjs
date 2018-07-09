import Compiler from "../build/compiler.js"

import assert from "assert"

const SCRIPT = 1
const MODULE = 2
const UNAMBIGUOUS = 3

const modernTypes = [MODULE, UNAMBIGUOUS]
const sourceTypes = [SCRIPT, MODULE, UNAMBIGUOUS]

describe("compiler", () => {
  it("should support `options.cjs.topLevelReturn`", () => {
    assert.doesNotThrow(() => Compiler.compile("return"))

    assert.doesNotThrow(() => Compiler.compile("return", {
      cjs: {
        topLevelReturn: true
      },
      sourceType: MODULE
    }))

    assert.throws(
      () => Compiler.compile("return", { sourceType: MODULE }),
      /SyntaxError: Illegal return statement/
    )
  })

  it("should support `options.sourceType`", () => {
    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile('import"a"', { sourceType })

      assert.strictEqual(result.sourceType, MODULE)
    })
  })

  it("should support `options.cjs.vars`", () => {
    const code = "arguments"

    let result = Compiler.compile(code)

    assert.strictEqual(result.code, code)

    result = Compiler.compile(code, {
      cjs: {
        vars: true
      },
      sourceType: MODULE
    })

    assert.strictEqual(result.code, code)

    result = Compiler.compile(code, { sourceType: MODULE })

    assert.ok(result.code.includes('_.t("arguments")'))
  })

  it("should support `options.sourceType` of MODULE", () => {
    [
      "1+2",
      "1+2//import",
      "1+2//import.meta",
      '"use module";1+2',
      "'use module';1+2",
      '"use script";1+2',
      "'use script';1+2",
      "import'a'",
      'import"a"',
      "import.meta"
    ]
    .forEach((code) => {
      const result = Compiler.compile(code, { sourceType: MODULE })

      assert.strictEqual(result.sourceType, MODULE)
    })
  })

  it("should support `options.sourceType` of UNAMBIGUOUS", () => {
    [
      { code: "1+2", sourceType: SCRIPT },
      { code: "1+2//import", sourceType: SCRIPT },
      { code: "1+2//import.meta", sourceType: SCRIPT },
      { code: "return 1+2//eval", sourceType: SCRIPT },
      { code: "1+2", hint: MODULE, sourceType: MODULE },
      { code: '"use module";1+2', sourceType: MODULE },
      { code: "'use module';1+2", hint: MODULE, sourceType: MODULE },
      { code: '"use script";1+2', sourceType: SCRIPT },
      { code: "'use script';1+2", hint: MODULE, sourceType: MODULE },
      { code: "import'a'", sourceType: MODULE },
      { code: 'import"a"', hint: MODULE, sourceType: MODULE },
      { code: "import.meta", sourceType: MODULE },
      { code: "import.meta", hint: MODULE, sourceType: MODULE }
    ]
    .forEach((data) => {
      const result = Compiler.compile(data.code, {
        hint: data.hint,
        sourceType: UNAMBIGUOUS
      })

      assert.strictEqual(result.sourceType, data.sourceType)
    })
  })

  it("should support `options.var`", () => {
    [void 0, false, true]
      .forEach((value) => {
        modernTypes.forEach((sourceType) => {
          const result = Compiler.compile('import a from "a"', {
            var: value,
            sourceType
          })

          assert.ok(result.code.includes(value ? "var a" : "let a"))
        })
      })
  })

  it('should support the "use module" directive', () => {
    [
      { code: "'use module';\"use script\";import'a'", hint: MODULE },
      { code: "'use module';\"use script\";import.meta", hint: MODULE },
      { code: '"use module";\'use script\';import"a"', hint: MODULE },
      { code: '"use module";\'use script\';import.meta', hint: MODULE },
      { code: "'use module';\"use script\";import'a'" },
      { code: "'use module';\"use script\";import.meta" },
      { code: '"use module";\'use script\';import"a"' },
      { code: '"use module";\'use script\';import.meta' }
    ]
    .forEach((data) => {
      const result = Compiler.compile(data.code, {
        hint: data.hint,
        sourceType: UNAMBIGUOUS
      })

      assert.strictEqual(result.sourceType, MODULE)
    })
  })

  it('should support the "use script" directive', () => {
    [
      { code: "'use script';\"use module\";import'a'", hint: SCRIPT },
      { code: "'use script';\"use module\";import.meta", hint: SCRIPT },
      { code: '"use script";\'use module\';import"a"', hint: SCRIPT },
      { code: '"use script";\'use module\';import.meta', hint: SCRIPT },
      { code: "'use script';\"use module\";import'a'" },
      { code: "'use script';\"use module\";import.meta" },
      { code: '"use script";\'use module\';import"a"' },
      { code: '"use script";\'use module\';import.meta' }
    ]
    .forEach((data) => {
      assert.throws(
        () => Compiler.compile(data.code, {
          hint: data.hint,
          sourceType: UNAMBIGUOUS
        }),
        SyntaxError
      )
    })
  })

  it("should support shebangs", () => {
    const shebang = "#!/usr/bin/env node -r esm"

    const code = [
      shebang,
      'import a from "a"'
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code.includes(shebang), false)
    })
  })

  it("should support trailing comments", () => {
    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile('import"a"//trailing comment', { sourceType })

      assert.ok(result.code.endsWith("//trailing comment"))
    })
  })

  it("should compile dynamic import with script source sourceType", () => {
    const result = Compiler.compile('import("a")', {
      sourceType: SCRIPT
    })

    assert.ok(result.code.includes('i("a")'))
  })

  it("should transform dynamic import in switch statements", () => {
    const code = [
      "(async () => {",
      '  switch (await import("a")) {',
      '    case await import("b"):',
      '      return await import ("c")',
      "  }",
      "})()"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code.includes("import"), false)
    })
  })

  it("should preserve line numbers", () => {
    const code = [
      "import",
      "",
      "a",
      "",
      'from "a"',
      "",
      "export",
      "",
      "default",
      "",
      "() =>",
      "//",
      "{",
      "b",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })
      const lines = result.code.split("\n")

      assert.strictEqual(lines[13], "b")
    })
  })

  it("should preserve crlf newlines", () => {
    const code = [
      "import {",
      "  strictEqual,",
      "",
      "  deepEqual",
      "}",
      'from "assert"'
    ].join("\r\n")

    modernTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.ok(result.code.endsWith("\r\n".repeat(5)))
    })
  })

  it("should not get confused by string literals", () => {
    const code = [
      "'a; import b from " + '"c"; d' + "'",
      '"a; import b " + ' + "'from " + '"c"; d' + "'"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })

      assert.strictEqual(result.code, code)
    })
  })

  it("should parse shorthand async function properties with reserved names", () => {
    sourceTypes.forEach((sourceType) => {
      assert.doesNotThrow(
        () => Compiler.compile("({ async delete() {} })", { sourceType })
      )
    })
  })

  it("should parse arrow functions with destructured arguments", () => {
    [
      "({ a = 1 }) => {}",
      "({ a = 1 }, { b = 2 }) => {}"
    ]
    .forEach((code) => {
      sourceTypes.forEach((sourceType) => {
        assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
      })
    })
  })

  it("should parse transforms at the end of the source", () => {
    [
      'import { a } from "a"',
      'import "a"',
      "let a; export { a }",
      "export default a"
    ]
    .forEach((code) => {
      modernTypes.forEach((sourceType) => {
        assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
      })
    })
  })

  it("should parse async generator syntax", () => {
    const code = [
      "export default async function * a() {}",
      "export const b = {",
      "  async *b() {}",
      "}",
      "export class C {",
      "  async *c() {}",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    })
  })

  it("should parse BigInt syntax", () => {
    const code = [
      "1n",
      "1234567890123456789n",
      "0b01n",
      "0B01n",
      "0xan",
      "0xAn",
      "0xfn",
      "0xFn",
      "0o01n",
      "0O01n"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    })
  })

  it("should parse numeric separator syntax", () => {
    const code = [
      "1_0",
      ".1_0e1_0",
      ".1_0E1_0",
      "0b0_1",
      "0B0_1",
      "0x0_a",
      "0x0_A",
      "0x0_f",
      "0x0_F",
      "0o0_1",
      "0O0_1"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    })
  })

  it("should parse BigInt and numeric separator syntax", () => {
    const code = [
      "1_0n",
      "0b0_1n",
      "0B0_1n",
      "0x0_an",
      "0x0_An",
      "0x0_fn",
      "0x0_Fn",
      "0o0_1n",
      "0O0_1n"
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    })
  })

  it("should parse class fields syntax", () => {
    const code = [
      "export class A { a }",
      'export class B { b = "b" }',
      "export class C { #c }",
      "export class D { async }",
      "export class E { get }",
      "export class F { set }",
      "export class G { static }",
      "export class H {",
      '  #h= "h"',
      "  h() {",
      "    return this.#h",
      "  }",
      "}",
      "export class I {",
      "  async = 1;",
      "  get = 1",
      "  set = 1",
      "  static = 1",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    })
  })

  it("should parse for-await-of syntax", () => {
    const code = [
      "export default async function convert(iterable) {",
      "  const result = []",
      "  for await (const value of iterable) {",
      "    result.push(value)",
      "  }",
      "  return result",
      "}"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    })
  })

  it("should parse object rest/spread syntax", () => {
    const code = [
      'const ab = { a: "a", b: "b" }',
      'const abc = { ...K(ab), c: "c" }',
      "export const { a, ...bc } = abc",
      "export const d = ({ a, ...bcd } = {}) => bcd",
      "export default { ...abc, d }"
    ].join("\n")

    modernTypes.forEach((sourceType) => {
      assert.doesNotThrow(() => Compiler.compile(code, { sourceType }))
    })
  })

  it("should instrument console use", () => {
    const lines = [
      "console",
      "console.log(a)",
      "new console.Console(a)",
      "class C extends console.Console {}"
    ]

    const compiled = [
      "_.g.console",
      "_.g.console.log(a)",
      "new _.g.console.Console(a)",
      "class C extends _.g.console.Console {}"
    ]

    lines.forEach((line, index) => {
      const code = [
        "",
        line
      ].join("\n")

      sourceTypes.forEach((sourceType) => {
        const result = Compiler.compile(code, { sourceType })
        const actual = result.code.split("\n").pop()

        assert.strictEqual(actual, compiled[index])
      })
    })
  })

  it("should not instrument console in a typeof expression", () => {
    const line = "typeof console"

    const code = [
      "",
      line
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })
      const actual = result.code.split("\n").pop()

      assert.strictEqual(actual, line)
    })
  })

  it("should wrap eval use", () => {
    const lines = [
      "eval",
      "function b(c, d = 1, ...e) { return eval }",
      "const b = { eval }",
      "const b = { eval() { eval } }",
      "const b = () => eval",
      "b(eval, c)",
      "new eval.b.c()",
      "`eval ${ eval } eval`",
      "switch (eval) { case eval: eval }",
      "try {} catch { eval }"
    ]

    const compiledModule = [
      "_.e",
      "function b(c, d = 1, ...e) { return _.e }",
      "const b = { eval:_.e }",
      "const b = { eval() { _.e } }",
      "const b = () => _.e",
      "b(_.e, c)",
      "new _.e.b.c()",
      "`eval ${ _.e } eval`",
      "switch (_.e) { case _.e: _.e }",
      "try {} catch { _.e }"
    ]

    const compiledScript = [
      "(eval===_.v?_.e:eval)",
      "function b(c, d = 1, ...e) { return (eval===_.v?_.e:eval) }",
      "const b = { eval:(eval===_.v?_.e:eval) }",
      "const b = { eval() { (eval===_.v?_.e:eval) } }",
      "const b = () => (eval===_.v?_.e:eval)",
      "b((eval===_.v?_.e:eval), c)",
      "new (eval===_.v?_.e:eval).b.c()",
      "`eval ${ (eval===_.v?_.e:eval) } eval`",
      "switch ((eval===_.v?_.e:eval)) { case (eval===_.v?_.e:eval): (eval===_.v?_.e:eval) }",
      "try {} catch { (eval===_.v?_.e:eval) }"
    ]

    lines.forEach((line, index) => {
      const code = [
        "",
        line
      ].join("\n")

      sourceTypes.forEach((sourceType) => {
        const result = Compiler.compile(code, { sourceType })
        const actual = result.code.split("\n").pop()
        const compiled = sourceType === SCRIPT ? compiledScript : compiledModule

        assert.strictEqual(actual, compiled[index])
      })
    })
  })

  it("should not wrap shadowed eval", () =>
    [
      "function b(eval) { eval = eval }",
      "function b(...eval) { eval = eval }",
      "function b(eval = 1) { eval = eval }",
      "const b = { eval: 1 }",
      "const b = function eval() { eval = eval }",
      "try {} catch(eval) { eval = eval }",
      "eval: while (true) { break eval; continue eval }"
    ]
    .forEach((code) => {
      const result = Compiler.compile(code)

      assert.strictEqual(result.code, code)
    })
  )

  it("should not wrap eval in a typeof expression", () => {
    const line = "typeof eval"

    const code = [
      "",
      line
    ].join("\n")

    sourceTypes.forEach((sourceType) => {
      const result = Compiler.compile(code, { sourceType })
      const actual = result.code.split("\n").pop()

      assert.strictEqual(actual, line)
    })
  })

  it("should not wrap eval in a with statement", () => {
    const code = [
      "",
      "with (eval) { eval = eval }"
    ].join("\n")

    const result = Compiler.compile(code)
    const actual = result.code.split("\n").pop()

    assert.strictEqual(actual, "with ((eval===_.v?_.e:eval)) { eval = eval }")
  })

  it("should add TDZ asserts to bindings", () => {
    const lines = [
      "a",
      "function b(c, d = 1, ...e) { return a }",
      "const b = { a }",
      "const b = { a() { a } }",
      "const b = () => a",
      "b(a, c)",
      "new a.b.c()",
      "`a ${ a } a`",
      "switch (a) { case a: a }",
      "try {} catch { a }"
    ]

    const compiled = [
      '_.a("a",a)',
      'function b(c, d = 1, ...e) { return _.a("a",a) }',
      'const b = { a:_.a("a",a) }',
      'const b = { a() { _.a("a",a) } }',
      'const b = () => _.a("a",a)',
      'b(_.a("a",a), c)',
      'new (_.a("a",a)).b.c()',
      '`a ${ _.a("a",a) } a`',
      'switch (_.a("a",a)) { case _.a("a",a): _.a("a",a) }',
      'try {} catch { _.a("a",a) }'
    ]

    lines.forEach((line, index) => {
      const code = [
        'import a from "a"',
        line
      ].join("\n")

      modernTypes.forEach((sourceType) => {
        const result = Compiler.compile(code, { sourceType })

        result.enforceTDZ()

        const actual = result.code.split("\n").pop()

        assert.strictEqual(actual, compiled[index])
      })
    })
  })

  it("should not add TDZ asserts to shadowed bindings", () =>
    [
      "function b(a) { a = a }",
      "function b(...a) { a = a }",
      "function b(a = 1) { a = a }",
      "const b = { a: 1 }",
      "const b = function a() { a = a }",
      "try {} catch(a) { a = a }",
      "a: while (true) { break a; continue a }"
    ]
    .forEach((line) => {
      const code = [
        'import a from "a"',
        line
      ].join("\n")

      modernTypes.forEach((sourceType) => {
        const result = Compiler.compile(code, { sourceType })

        result.enforceTDZ()

        const actual = result.code.split("\n").pop()

        assert.strictEqual(actual, line)
      })
    })
  )

  it("should support V8 parse errors", () => {
    const options = { sourceType: MODULE }

    assert.throws(
      () => Compiler.compile("a(", options),
      /SyntaxError: Unexpected end of input/
    )

    assert.throws(
      () => Compiler.compile("a(b c)", options),
      /SyntaxError: missing \) after argument list/
    )

    assert.throws(
      () => Compiler.compile("'", options),
      /SyntaxError: Invalid or unexpected token/
    )

    assert.throws(
      () => Compiler.compile("`a", options),
      /SyntaxError: Unterminated template literal/
    )
  })
})
