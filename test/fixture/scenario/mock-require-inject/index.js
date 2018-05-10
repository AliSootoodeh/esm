import assert from "assert"
import * as fsNs from "fs"
import mock from "mock-require"
import * as pathNs from "path"
import requireInject from "require-inject"
import * as utilNs from "util"

let error
let pass = false
let threw = false

const mockFs = {
  default: "fs",
  mocked: true
}

const mockPath = {
  default: "path",
  mocked: true
}

const mockReal2 = {
  default: "mock2",
  mocked: true
}

const mockReal3 = {
  default: "mock3",
  mocked: true
}

const mockUtil = {
  default: "util"
}

const hybridMocks = [
  mockPath,
  mockReal2,
  mockReal3
]

hybridMocks.forEach((mock) => {
  Reflect.defineProperty(mock, "__esModule", {
    value: true
  })
})

mock("fs", "./fs.js")
mock("./real1.js", "./mock1.js")
mock("./real2.js", mockReal2)
mock("util", "./util.js")

import("./load.js")
  .then((ns) => {
    const expected = {
      fs: mockFs,
      path: pathNs,
      real1: {
        default: "mock1",
        mocked: true
      },
      real2: mockReal2,
      real3: {
        default: "real3"
      },
      util: mockUtil
    }

    assert.deepEqual(ns, expected)

    const exported = requireInject("./load.js", {
      path: mockPath,
      "./real3.js": mockReal3
    })

    expected.path = mockPath
    expected.real3 = mockReal3

    assert.deepEqual(exported, expected)
  })
  .then(() =>
    Promise
      .all([
        import("fs")
          .then((ns) => assert.deepEqual(ns, mockFs)),
        import("path")
          .then((ns) => assert.strictEqual(ns, pathNs)),
        import("util")
          .then((ns) => assert.deepEqual(ns, mockUtil))
      ])
  )
  .then(() => {
    mock.stopAll()

    return Promise
      .all([
        import("fs")
          .then((ns) => assert.strictEqual(ns, fsNs)),
        import("path")
          .then((ns) => assert.strictEqual(ns, pathNs)),
        import("util")
          .then((ns) => assert.strictEqual(ns, utilNs))
      ])
  })
  .then(() => {
    pass = true
  })
  .catch((e) => {
    error = e
    threw = true
  })

setTimeout(() => {
  if (threw) {
    throw error
  }

  assert.ok(pass)
}, 2000)
