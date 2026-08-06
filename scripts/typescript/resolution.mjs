/// <reference types="node" />

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

/** @typedef {Record<string, unknown>} JsonObject */
/** @typedef {{ compilerOptions: JsonObject }} EffectiveConfig */

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const projectsDirectory = path.join(import.meta.dirname, "projects")
const maximumRootProjects = 100

// Committed Payload migrations are immutable generated history, but
// payload.config.ts imports ./migrations, so the strict wrapper substitutes a
// typed façade (src/migrations-strict.d.ts) via this exact suffix list instead
// of pulling generated implementations into the strict program.
const wrapperResolutionExceptions = new Map([
  [
    "scripts/typescript/projects/apps/payload/tsconfig.json",
    new Map([["moduleSuffixes", JSON.stringify(["-strict", ""])]]),
  ],
])

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
 * @param {string} filePath - JSON file to read.
 * @returns {JsonObject} Validated JSON object.
 */
const readJson = (filePath) =>
  parseJsonObject(readFileSync(filePath, "utf-8"), filePath)

/**
 * @param {JsonObject} object - Object containing an optional object.
 * @param {string} key - Property to read.
 * @returns {JsonObject} Validated object or an empty object.
 */
const readOptionalObject = (object, key) => {
  const value = object[key]
  if (value === undefined) {
    return {}
  }
  if (isJsonObject(value)) {
    return value
  }
  return fail(`${key} must be an object`)
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
 * @param {JsonObject} wrapper - Strict wrapper configuration.
 * @param {string} wrapperPath - Wrapper path used in diagnostics.
 * @returns {string} Source configuration reference.
 */
const readSourceReference = (wrapper, wrapperPath) => {
  const { extends: extendedConfigs } = wrapper
  if (
    !Array.isArray(extendedConfigs) ||
    extendedConfigs.length === 0 ||
    !extendedConfigs.every((value) => typeof value === "string")
  ) {
    return fail(`${relative(wrapperPath)} must extend a source config`)
  }
  const sourceReference = extendedConfigs.at(-1)
  if (sourceReference === undefined) {
    return fail(`${relative(wrapperPath)} must extend a source config`)
  }
  return sourceReference
}

/**
 * @param {string} filePath - Repository path.
 * @returns {string} Normalized repository-relative path.
 */
const relative = (filePath) =>
  path.relative(repositoryRoot, filePath).replaceAll(path.sep, "/")

/**
 * @param {string} configPath - TypeScript config to expand.
 * @returns {EffectiveConfig} Validated effective configuration.
 */
const showConfig = (configPath) => {
  const output = execFileSync(
    path.join(repositoryRoot, "node_modules/.bin/tsc"),
    ["--showConfig", "-p", configPath],
    { cwd: repositoryRoot, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  )
  const result = parseJsonObject(output, `tsc --showConfig for ${configPath}`)
  return { compilerOptions: readOptionalObject(result, "compilerOptions") }
}

const rootConfig = readJson(path.join(repositoryRoot, "tsconfig.json"))
const referencePaths = readReferencePaths(rootConfig)
for (const referencePath of referencePaths) {
  const wrapperPath = path.resolve(repositoryRoot, referencePath)
  const wrapper = readJson(wrapperPath)
  const sourcePath = path.resolve(
    path.dirname(wrapperPath),
    readSourceReference(wrapper, wrapperPath),
  )
  const source = showConfig(sourcePath).compilerOptions
  const effective = showConfig(wrapperPath).compilerOptions
  for (const option of [
    "baseUrl",
    "customConditions",
    "jsx",
    "lib",
    "module",
    "moduleResolution",
    "moduleSuffixes",
    "paths",
    "plugins",
    "rootDirs",
    "typeRoots",
    "types",
  ]) {
    const effectiveValue = JSON.stringify(effective[option])
    if (effectiveValue !== JSON.stringify(source[option])) {
      const allowedValue = wrapperResolutionExceptions
        .get(relative(wrapperPath))
        ?.get(option)
      if (allowedValue === undefined || effectiveValue !== allowedValue) {
        fail(
          `${relative(wrapperPath)} changes source compiler resolution option ${option}`,
        )
      }
    }
  }
  const wrapperRelativePath = path.relative(projectsDirectory, wrapperPath)
  if (
    wrapperRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(wrapperRelativePath)
  ) {
    fail(`${relative(wrapperPath)} is outside wrapper directory`)
  }
}

console.log(
  `TypeScript resolution passed: ${referencePaths.length} wrappers preserve source module, JSX, library, path, plugin, and type settings.`,
)
