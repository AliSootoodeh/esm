"use strict"

const execa = require("execa")
const fleece = require("golden-fleece")
const fs = require("fs-extra")
const htmlmin = require("html-minifier").minify
const path = require("path")
const uglify = require("uglify-es").minify

const rootPath = path.resolve(__dirname, "..")
const esmPath = path.resolve(rootPath, "esm.js")
const indexPath = path.resolve(rootPath, "index.js")
const pkgPath = path.resolve(rootPath, "package.json")
const readmePath = path.resolve(rootPath, "README.md")

const uglifyOptions = fs.readJSONSync(path.resolve(rootPath, ".uglifyrc"))

const tableRegExp = /^<table>[^]*?\n<\/table>/gm

const defaultScripts = {
  test: 'echo "Error: no test specified" && exit 1'
}

const fieldsToRemove = [
  "devDependencies",
  "esm",
  "private"
]

const jsPaths = [
  esmPath,
  indexPath
]

function cleanJS() {
  jsPaths.forEach((filename) => {
    const content = fs.readFileSync(filename, "utf8")

    process.once("exit", () => fs.outputFileSync(filename, content))

    fs.outputFileSync(filename, minifyJS(content))
  })
}

function cleanPackageJSON() {
  const content = fs.readFileSync(pkgPath, "utf8")

  process.once("exit", () => fs.outputFileSync(pkgPath, content))

  const pkgJSON = JSON.parse(content)

  pkgJSON.scripts = defaultScripts
  fieldsToRemove.forEach((field) => Reflect.deleteProperty(pkgJSON, field))
  fs.outputFileSync(pkgPath, fleece.patch(content, pkgJSON))
}

function cleanReadme() {
  const content = fs.readFileSync(readmePath, "utf8")

  process.once("exit", () => fs.outputFileSync(readmePath, content))

  fs.outputFileSync(readmePath, content.replace(tableRegExp, minifyHTML))
}

function minifyHTML(content) {
  return htmlmin(content, {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    decodeEntities: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeEmptyElements: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeTagWhitespace: true
  })
}

function minifyJS(content) {
  return uglify(content, uglifyOptions).code
}

function publishPackage() {
  return execa("npm", ["publish"], {
    cwd: rootPath,
    stdio: "inherit"
  })
}

Promise
  .all([
    cleanJS(),
    cleanPackageJSON(),
    cleanReadme()
  ])
  .then(publishPackage)
  .catch(console.error)
