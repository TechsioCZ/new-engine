/// <reference types="node" />

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

import { z } from "zod"

/** @typedef {"tsc" | "tsgo"} CompilerName */

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const maximumRootProjects = 100
const rootConfigSchema = z.object({
  references: z
    .array(z.object({ path: z.string() }))
    .min(1)
    .max(maximumRootProjects),
})
const compilerArguments = process.argv.slice(2)
const compilerOptionIndex = compilerArguments.indexOf("--compiler")
/** @type {unknown} */
const requestedCompiler =
  compilerOptionIndex === -1
    ? "tsc"
    : compilerArguments[compilerOptionIndex + 1]
if (compilerOptionIndex !== -1) {
  compilerArguments.splice(compilerOptionIndex, 2)
}
const skipDistBuildsOptionIndex =
  compilerArguments.indexOf("--skip-dist-builds")
const skipDistBuilds = skipDistBuildsOptionIndex !== -1
if (skipDistBuilds) {
  compilerArguments.splice(skipDistBuildsOptionIndex, 1)
}
if (requestedCompiler !== "tsc" && requestedCompiler !== "tsgo") {
  throw new Error("--compiler must be either tsc or tsgo")
}
/** @type {CompilerName} */
const compilerName = requestedCompiler

/**
 * @param {string} message - Failure description.
 * @returns {never} This function never returns.
 */
const fail = (message) => {
  throw new Error(message)
}

/**
 * @param {string} text - JSON text.
 * @param {string} source - Source used in diagnostics.
 * @returns {string[]} Validated root reference paths.
 */
const readReferencePaths = (text, source) => {
  const result = rootConfigSchema.safeParse(JSON.parse(text))
  if (!result.success) {
    return fail(
      `${source} must reference between 1 and ${maximumRootProjects} TypeScript projects`,
    )
  }
  return result.data.references.map((reference) => reference.path)
}

/**
 * @param {string} command - Executable to run.
 * @param {string[]} argumentsToPass - Executable arguments.
 * @param {{ continueOnError?: boolean }} [options] - Execution behavior.
 * @returns {number} Child exit status, or one when terminated by a signal.
 */
const run = (command, argumentsToPass, { continueOnError = false } = {}) => {
  const result = spawnSync(command, argumentsToPass, {
    cwd: repositoryRoot,
    stdio: "inherit",
  })
  if (result.error !== undefined) {
    throw result.error
  }
  const status = result.status ?? 1
  if (status !== 0 && !continueOnError) {
    process.exit(status)
  }
  return status
}

run(process.execPath, [path.join(import.meta.dirname, "audit.mjs")])
run(process.execPath, [path.join(import.meta.dirname, "resolution.mjs")])
if (!skipDistBuilds) {
  run("pnpm", ["--filter", "@techsio/std", "build"])
  run("pnpm", ["--filter", "@techsio/ui-kit", "build"])
}

const rootConfigPath = path.join(repositoryRoot, "tsconfig.json")
const referencePaths = readReferencePaths(
  readFileSync(rootConfigPath, "utf-8"),
  rootConfigPath,
)
const compiler = path.join(repositoryRoot, "node_modules/.bin", compilerName)
let failedProjects = 0
for (const projectPath of referencePaths) {
  const absoluteProjectPath = path.resolve(repositoryRoot, projectPath)
  const relativeProjectPath = path.relative(repositoryRoot, absoluteProjectPath)
  if (
    relativeProjectPath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeProjectPath)
  ) {
    fail(`TypeScript project resolves outside the repository: ${projectPath}`)
  }
  const status = run(
    compiler,
    [
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      absoluteProjectPath,
      ...compilerArguments,
    ],
    { continueOnError: true },
  )
  if (status !== 0) {
    failedProjects += 1
  }
}
if (failedProjects > 0) {
  console.error(`${compilerName} failed in ${failedProjects} root project(s).`)
  process.exit(1)
}
