import getOptions from "../env/get-options.js"
import isCheck from "../env/is-check.js"
import isCLI from "../env/is-cli.js"
import isDevelopment from "../env/is-development.js"
import isElectron from "../env/is-electron.js"
import isEval from "../env/is-eval.js"
import isInspect from "../env/is-inspect.js"
import isInternal from "../env/is-internal.js"
import isNyc from "../env/is-nyc.js"
import isPreloaded from "../env/is-preloaded.js"
import isPrint from "../env/is-print.js"
import isREPL from "../env/is-repl.js"
import isWin32 from "../env/is-win32.js"
import setDeferred from "../util/set-deferred.js"

const ENV = { __proto__: null }

setDeferred(ENV, "CHECK", isCheck)
setDeferred(ENV, "CLI", isCLI)
setDeferred(ENV, "DEVELOPMENT", isDevelopment)
setDeferred(ENV, "ELECTRON", isElectron)
setDeferred(ENV, "EVAL", isEval)
setDeferred(ENV, "INSPECT", isInspect)
setDeferred(ENV, "INTERNAL", isInternal)
setDeferred(ENV, "NYC", isNyc)
setDeferred(ENV, "OPTIONS", getOptions)
setDeferred(ENV, "PRELOADED", isPreloaded)
setDeferred(ENV, "PRINT", isPrint)
setDeferred(ENV, "REPL", isREPL)
setDeferred(ENV, "WIN32", isWin32)

export default ENV
