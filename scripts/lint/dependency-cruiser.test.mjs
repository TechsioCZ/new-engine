import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"

import { z } from "zod"

import importedConfig from "../../dependency-cruiser.config.cjs"
import projectResolver from "./dependency-cruiser-projects.cjs"

const { readProjects } = projectResolver

const pathPatternSchema = z.union([z.string(), z.array(z.string())])
const boundarySchema = z.object({
  path: pathPatternSchema.optional(),
  pathNot: pathPatternSchema.optional(),
})
const configSchema = z.object({
  forbidden: z.array(
    z.object({
      from: boundarySchema,
      name: z.string(),
      to: boundarySchema,
    }),
  ),
})

/** @type {unknown} */
const configInput = importedConfig
const config = configSchema.parse(configInput)
const rules = new Map(config.forbidden.map((rule) => [rule.name, rule]))

/** @typedef {string | string[]} PathPattern */
/** @typedef {{ path?: PathPattern, pathNot?: PathPattern }} Boundary */
/** @typedef {{ from: Boundary, name: string, to: Boundary }} BoundaryRule */

/**
 * @param {PathPattern | undefined} pattern - Pattern to match.
 * @param {string} value - Candidate module path.
 */
const matches = (pattern, value) => {
  if (pattern === undefined) {
    return false
  }
  if (Array.isArray(pattern)) {
    return pattern.some((entry) => new RegExp(entry, "u").test(value))
  }
  return new RegExp(pattern, "u").test(value)
}

/**
 * @param {Boundary} boundary - Boundary side to evaluate.
 * @param {string} value - Candidate module path.
 */
const boundaryCatches = (boundary, value) => {
  if (boundary.path !== undefined && !matches(boundary.path, value)) {
    return false
  }
  return !matches(boundary.pathNot, value)
}

/**
 * @param {BoundaryRule} rule - Dependency rule to evaluate.
 * @param {string} from - Importing module path.
 * @param {string} to - Imported module path.
 */
const catches = (rule, from, to) =>
  boundaryCatches(rule.from, from) && boundaryCatches(rule.to, to)

const APP_SOURCE = "apps/n1/src/page.tsx"
const BACKEND_SOURCE = "apps/medusa-be/src/index.ts"
const LIBRARY_SOURCE = "libs/storefront-data/src/index.ts"

void test("application boundaries allow own files and libraries, not other apps", () => {
  const rule = rules.get("app-depends-on-libraries-apps-n1")
  assert.ok(rule)
  assert.equal(catches(rule, APP_SOURCE, "apps/n1/src/lib.ts"), false)
  assert.equal(catches(rule, APP_SOURCE, "libs/ui/src/button.tsx"), false)
  assert.equal(catches(rule, APP_SOURCE, BACKEND_SOURCE), true)
})

void test("library boundaries reject application dependencies", () => {
  const rule = rules.get("libraries-do-not-import-applications")
  assert.ok(rule)
  assert.equal(catches(rule, LIBRARY_SOURCE, APP_SOURCE), true)
})

void test("platform boundaries reject web to backend imports", () => {
  const rule = rules.get("web-does-not-import-backend")
  assert.ok(rule)
  assert.equal(catches(rule, APP_SOURCE, BACKEND_SOURCE), true)
  assert.equal(catches(rule, APP_SOURCE, LIBRARY_SOURCE), false)
})

void test("package-only Nx tags stay in parity with architecture fallbacks", async () => {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "dependency-cruiser-tags-"),
  )
  const projectRoot = path.join(fixtureRoot, "apps", "package-only")
  const manifestTags = ["type:app", "platform:web", "framework:react"]

  try {
    await mkdir(projectRoot, { recursive: true })
    await writeFile(
      path.join(projectRoot, "package.json"),
      JSON.stringify({ nx: { tags: manifestTags } }),
    )

    assert.deepEqual(
      readProjects(fixtureRoot, {
        fallbackTags: {
          "apps/package-only": ["framework:react", "platform:web", "type:app"],
        },
        workspaceFolders: ["apps"],
      }),
      [{ root: "apps/package-only", tags: manifestTags }],
    )

    assert.throws(
      () =>
        readProjects(fixtureRoot, {
          fallbackTags: {
            "apps/package-only": [
              "type:app",
              "platform:shared",
              "framework:agnostic",
            ],
          },
          workspaceFolders: ["apps"],
        }),
      /apps\/package-only Nx tags disagree with dependency-cruiser fallback/u,
    )
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true })
  }
})
