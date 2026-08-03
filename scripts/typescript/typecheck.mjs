import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const arguments_ = process.argv.slice(2)
const compilerOptionIndex = arguments_.indexOf("--compiler")
const compilerName =
  compilerOptionIndex === -1 ? "tsc" : arguments_[compilerOptionIndex + 1]
if (compilerOptionIndex !== -1) {
  arguments_.splice(compilerOptionIndex, 2)
}
if (compilerName !== "tsc" && compilerName !== "tsgo") {
  throw new Error("--compiler must be either tsc or tsgo")
}

const run = (command, args, { continueOnError = false } = {}) => {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0 && !continueOnError) {
    process.exit(result.status ?? 1)
  }
  return result.status ?? 1
}

run(process.execPath, [path.join(import.meta.dirname, "audit.mjs")])
run(process.execPath, [path.join(import.meta.dirname, "resolution.mjs")])
run("pnpm", ["--filter", "@techsio/std", "build"])

const rootConfig = JSON.parse(
  readFileSync(path.join(repositoryRoot, "tsconfig.json"), "utf-8")
)
const compiler = path.join(repositoryRoot, "node_modules/.bin", compilerName)
let failedProjects = 0
for (const { path: projectPath } of rootConfig.references ?? []) {
  const status = run(
    compiler,
    [
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      path.resolve(repositoryRoot, projectPath),
      ...arguments_,
    ],
    { continueOnError: true }
  )
  if (status !== 0) {
    failedProjects += 1
  }
}
if (failedProjects > 0) {
  console.error(`${compilerName} failed in ${failedProjects} root project(s).`)
  process.exit(1)
}
