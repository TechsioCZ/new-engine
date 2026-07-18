import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PLATFORM_PACKAGES = new Map([
  ["darwin-arm64", "@ast-grep/cli-darwin-arm64"],
  ["darwin-x64", "@ast-grep/cli-darwin-x64"],
  ["linux-arm64", "@ast-grep/cli-linux-arm64-gnu"],
  ["linux-x64", "@ast-grep/cli-linux-x64-gnu"],
  ["win32-arm64", "@ast-grep/cli-win32-arm64-msvc"],
  ["win32-ia32", "@ast-grep/cli-win32-ia32-msvc"],
  ["win32-x64", "@ast-grep/cli-win32-x64-msvc"],
])

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, "../..")
const platformKey = `${process.platform}-${process.arch}`
const packageName = PLATFORM_PACKAGES.get(platformKey)

if (!packageName) {
  throw new Error(`ast-grep does not publish a binary for ${platformKey}`)
}

const require = createRequire(import.meta.url)
const cliPackageJson = require.resolve("@ast-grep/cli/package.json")
const cliRequire = createRequire(cliPackageJson)
const packageJson = cliRequire.resolve(`${packageName}/package.json`)
const binaryName = process.platform === "win32" ? "ast-grep.exe" : "ast-grep"
const binaryPath = join(dirname(packageJson), binaryName)
const result = spawnSync(binaryPath, process.argv.slice(2), {
  cwd: repositoryRoot,
  stdio: "inherit",
})

if (result.error) {
  throw result.error
}

process.exitCode = result.status ?? 1
