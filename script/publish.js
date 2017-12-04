"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const path = require("path")

const rootPath = path.resolve(__dirname, "..")
const jsonPath = path.resolve(rootPath, "package.json")

const defaultScripts = `,
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  }`

const fieldsToRemove = [
  "@std/esm",
  "dependencies",
  "devDependencies",
  "optionalDevDependencies",
  "private"
]

const scriptsRegExp = makeFieldRegExp("scripts")

function cleanJSON(jsonText) {
  return removeFields(resetScripts(jsonText), fieldsToRemove)
}

function makeFieldRegExp(field) {
  return RegExp(',\\s*"' + field + '":\\s*(\\{[^]*?\\}|[^]*?)(?=,?\\n)')
}

function publishPackage() {
  return execa("npm", ["publish"], {
    cwd: rootPath,
    reject: false,
    stdio: "inherit"
  })
}

function removeField(jsonText, field) {
  return jsonText.replace(makeFieldRegExp(field), "")
}

function removeFields(jsonText, fields) {
  return fields.reduce(removeField, jsonText)
}

function resetScripts(jsonText) {
  return jsonText.replace(scriptsRegExp, defaultScripts)
}

fs.readFile(jsonPath, "utf8")
  .then((jsonText) =>
    fs.outputFile(jsonPath, cleanJSON(jsonText))
      .then(publishPackage)
      .then(() => fs.outputFile(jsonPath, jsonText))
  )
