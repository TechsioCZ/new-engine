/// <reference types="node" />

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

import { z } from "zod"

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const projectsDirectory = path.join(import.meta.dirname, "projects")
const maximumRootProjects = 100
const rootConfigSchema = z.object({
  references: z
    .array(z.object({ path: z.string() }))
    .min(1)
    .max(maximumRootProjects),
})
const wrapperConfigSchema = z.object({
  extends: z.union([z.string(), z.array(z.string()).min(1)]),
})
const resolutionOptionsSchema = z.object({
  baseUrl: z.unknown().optional(),
  customConditions: z.unknown().optional(),
  jsx: z.unknown().optional(),
  lib: z.unknown().optional(),
  module: z.unknown().optional(),
  moduleResolution: z.unknown().optional(),
  moduleSuffixes: z.unknown().optional(),
  paths: z.unknown().optional(),
  plugins: z.unknown().optional(),
  rootDirs: z.unknown().optional(),
  typeRoots: z.unknown().optional(),
  types: z.unknown().optional(),
})
const effectiveConfigSchema = z.object({
  compilerOptions: resolutionOptionsSchema,
})

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
 * @param {string} filePath - Root TypeScript configuration path.
 * @returns {string[]} Validated root reference paths.
 */
const readReferencePaths = (filePath) => {
  const result = rootConfigSchema.safeParse(
    JSON.parse(readFileSync(filePath, "utf-8")),
  )
  if (!result.success) {
    return fail(
      `${filePath} must reference between 1 and ${maximumRootProjects} TypeScript projects`,
    )
  }
  return result.data.references.map((reference) => reference.path)
}

/**
 * @param {string} filePath - Strict wrapper configuration path.
 * @returns {string} Source configuration reference.
 */
const readSourceReference = (filePath) => {
  const result = wrapperConfigSchema.safeParse(
    JSON.parse(readFileSync(filePath, "utf-8")),
  )
  if (!result.success) {
    return fail(`${relative(filePath)} must extend a source config`)
  }
  return typeof result.data.extends === "string"
    ? result.data.extends
    : (result.data.extends.at(-1) ??
        fail(`${relative(filePath)} must extend a source config`))
}

/**
 * @param {string} filePath - Repository path.
 * @returns {string} Normalized repository-relative path.
 */
const relative = (filePath) =>
  path.relative(repositoryRoot, filePath).replaceAll(path.sep, "/")

/**
 * @param {string} configPath - TypeScript config to expand.
 */
const showConfig = (configPath) => {
  const output = execFileSync(
    path.join(repositoryRoot, "node_modules/.bin/tsc"),
    ["--showConfig", "-p", configPath],
    { cwd: repositoryRoot, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  )
  const result = effectiveConfigSchema.safeParse(JSON.parse(output))
  if (!result.success) {
    return fail(`tsc --showConfig returned an invalid config for ${configPath}`)
  }
  return result.data
}

const referencePaths = readReferencePaths(
  path.join(repositoryRoot, "tsconfig.json"),
)
for (const referencePath of referencePaths) {
  const wrapperPath = path.resolve(repositoryRoot, referencePath)
  const sourcePath = path.resolve(
    path.dirname(wrapperPath),
    readSourceReference(wrapperPath),
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
