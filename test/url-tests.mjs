import assert from "assert"
import path from "path"
import getFilePathFromURL from "../build/get-file-path-from-url.js"
import getURLFromFilePath from "../build/get-url-from-file-path.js"

const isWin = process.platform === "win32"

const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.resolve(".")
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

describe("URL tests", () => {
  describe("getFilePathFromURL() tests", () => {
    it("should resolve URLs with file protocols", () => {
      let actual
      let expected

      expected = isWin ? "" : "/"
      actual = getFilePathFromURL("file:///")
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/user"
      actual = getFilePathFromURL("file:///home/user?query#fragment")
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/user/"
      actual = getFilePathFromURL("file:///home/user/?query#fragment")
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/user/ space"
      actual = getFilePathFromURL("file:///home/user/%20space")
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/home/us\\er"
      actual = getFilePathFromURL("file:///home/us%5Cer")
      assert.strictEqual(actual, expected)

      actual = getFilePathFromURL("file:///home/us%5cer")
      assert.strictEqual(actual, expected)

      expected = isWin ? "" : "/dev"
      actual = getFilePathFromURL("file://localhost/dev")
      assert.strictEqual(actual, expected)

      expected = isWin ? "C:\\Program Files\\" : "/C:/Program Files/"
      actual = getFilePathFromURL("file:///C:/Program%20Files/")
      assert.strictEqual(actual, expected)

      expected = isWin ? "\\\\host\\a\\b\\c" : ""
      actual = getFilePathFromURL("file://host/a/b/c?query#fragment")
      assert.strictEqual(actual, expected)

      expected = isWin ? "C:\\a\\b\\c" : "/C:/a/b/c"
      actual = getFilePathFromURL("file:///C:/a/b/c?query#fragment")
      assert.strictEqual(actual, expected)

      expected = isWin ? "\\\\w\u036A\u034Aei\u036C\u034Brd.com\\host\\a" : ""
      actual = getFilePathFromURL("file://xn--weird-prdj8vva.com/host/a")
      assert.strictEqual(actual, expected)

      actual = getFilePathFromURL("file:///C:/a%2Fb")
      assert.strictEqual(actual, "")

      actual = getFilePathFromURL("file:///C:/a%2fb")
      assert.strictEqual(actual, "")
    })

    it("should resolve URLs with protocol relative localhost", () => {
      const expected = isWin ? "" : "/dev"
      const actual = getFilePathFromURL("//localhost/dev")

      assert.strictEqual(actual, expected)
    })

    it("should not resolve URLs with other protocols", () =>
      Promise
        .all([
          "about:blank",
          "ftp://example.com/",
          "http://example.com/",
          "https://example.com/"
        ]
        .map((request) =>
          import(request)
            .then(assert.fail)
            .catch(({ code }) => assert.strictEqual(code, "ERR_INVALID_PROTOCOL"))
        ))
    )
  })

  describe("getURLFromFilePath() tests", () => {
    it("should preserve trailing slashes", () => {
      let actual
      let expected

      expected = isWin ? "file:///C:/" : "file:///"
      actual = getURLFromFilePath("/")
      assert.strictEqual(actual, expected)

      expected = testURL + "/a/"
      actual = getURLFromFilePath("a/")
      assert.strictEqual(actual, expected)

      expected = testURL + "/a" + (isWin ? "/" : "%5C")
      actual = getURLFromFilePath("a\\")
      assert.strictEqual(actual, expected)

      expected = isWin ? "file:///host/a/" : testURL + "/%5C%5Chost%5Ca%5C"
      actual = getURLFromFilePath("\\\\host\\a\\")
      assert.strictEqual(actual, expected)
    })

    it("should encode the URI", () => {
      let actual
      let expected

      expected = testURL + "/a" + (isWin ? "/b.js" : "%5Cb.js")
      actual = getURLFromFilePath("a\\b.js")
      assert.strictEqual(actual, expected)

      expected = testURL + "/a%20space.js"
      actual = getURLFromFilePath("a space.js")
      assert.strictEqual(actual, expected)

      expected = testURL + "/a/%25"
      actual = getURLFromFilePath("a/%")
      assert.strictEqual(actual, expected)

      expected = testURL + "/%08%09%0A%0D%23%25&:;=%3F.js"
      actual = getURLFromFilePath("\b\t\n\r#%&:;=?.js")
      assert.strictEqual(actual, expected)

      expected = testURL + "/%C3%A0.js"
      actual = getURLFromFilePath("à.js")
      assert.strictEqual(actual, expected)

      expected = testURL + "/%E2%82%AC.js"
      actual = getURLFromFilePath("€.js")
      assert.strictEqual(actual, expected)

      expected = testURL + "/%E4%BD%A0.js"
      actual = getURLFromFilePath("你.js")
      assert.strictEqual(actual, expected)

      expected = testURL + "/%F0%9F%9A%80.js"
      actual = getURLFromFilePath("🚀.js")
      assert.strictEqual(actual, expected)
    })
  })
})
