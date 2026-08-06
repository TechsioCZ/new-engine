/// <reference types="node" />

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

/** @typedef {Record<string, unknown>} JsonObject */
/** @typedef {"tsc" | "tsgo"} CompilerName */

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const maximumRootProjects = 100
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
 * @param {unknown} value - Value to narrow.
 * @returns {value is JsonObject} Whether the value is a JSON object.
 */
const isJsonObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * @param {string} text - JSON text.
 * @param {string} source - Source used in diagnostics.
 * @returns {JsonObject} Validated JSON object.
 */
const parseJsonObject = (text, source) => {
  /** @type {unknown} */
  const value = JSON.parse(text)
  if (isJsonObject(value)) {
    return value
  }
  return fail(`${source} must contain a JSON object`)
}

/**
 * @param {JsonObject} config - TypeScript configuration.
 * @returns {string[]} Validated root reference paths.
 */
const readReferencePaths = (config) => {
  const { references } = config
  if (!Array.isArray(references)) {
    return fail("tsconfig.json references must be an array")
  }
  if (references.length === 0 || references.length > maximumRootProjects) {
    return fail(
      `tsconfig.json must reference between 1 and ${maximumRootProjects} projects`,
    )
  }
  /** @type {string[]} */
  const referencePaths = []
  for (const value of references) {
    /** @type {unknown} */
    const reference = value
    if (!isJsonObject(reference) || typeof reference.path !== "string") {
      return fail("each TypeScript reference must have a string path")
    }
    referencePaths.push(reference.path)
  }
  return referencePaths
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
run("pnpm", ["--filter", "@techsio/std", "build"])

const rootConfigPath = path.join(repositoryRoot, "tsconfig.json")
const rootConfig = parseJsonObject(
  readFileSync(rootConfigPath, "utf-8"),
  rootConfigPath,
)
const referencePaths = readReferencePaths(rootConfig)
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
