/// <reference types="node" />

const fs = require("node:fs")
const path = require("node:path")
const swc = require("@swc/core")

const workspaceRoot = __dirname

// dependency-cruiser 18 supports TypeScript <7 through tsc. Use its supported
// SWC parser for TypeScript 7, while supplying the TSX flag its parser omits.
const { parseFileSync } = swc
swc.parseFileSync = (fileName, options) =>
  parseFileSync(fileName, {
    ...options,
    tsx: /\.[cm]?[jt]sx$/u.test(fileName),
  })
const workspaceFolders = ["apps", "libs"]

const TYPE_APP = "type:app"
const TYPE_LIB = "type:lib"
const PLATFORM_WEB = "platform:web"
const PLATFORM_SHARED = "platform:shared"
const FRAMEWORK_NEXT = "framework:next"
const FRAMEWORK_AGNOSTIC = "framework:agnostic"
const WORKSPACE_SOURCE_PATTERN = "^(?:apps|libs)/"

/** @type {Readonly<Record<string, readonly string[]>>} */
const fallbackTags = {
  "apps/herbatika": [TYPE_APP, PLATFORM_WEB, FRAMEWORK_NEXT],
  "apps/payload": [TYPE_APP, PLATFORM_WEB, FRAMEWORK_NEXT],
  "apps/smart-suggest": [TYPE_APP, PLATFORM_WEB, FRAMEWORK_NEXT],
  "libs/smart-suggest": [TYPE_LIB, PLATFORM_WEB, "framework:react"],
  "libs/std": [TYPE_LIB, PLATFORM_SHARED, FRAMEWORK_AGNOSTIC],
  "libs/storefront-data": [TYPE_LIB, PLATFORM_SHARED, FRAMEWORK_AGNOSTIC],
  "libs/storefront-i18n": [TYPE_LIB, PLATFORM_WEB, FRAMEWORK_NEXT],
  "libs/storefront-security": [TYPE_LIB, PLATFORM_SHARED, FRAMEWORK_AGNOSTIC],
}

/**
 * @param {unknown} value - Candidate value read from untrusted JSON.
 * @returns {value is string[]} Whether the value is an all-string array.
 */
const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string")

/**
 * Reads the Nx `tags` array from parsed project.json contents, treating the
 * document as untrusted input.
 * @param {unknown} metadata - Parsed project.json document.
 * @returns {readonly string[] | null} Non-empty tags, when present.
 */
const readManifestTags = (metadata) => {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("tags" in metadata)
  ) {
    return null
  }

  const { tags } = metadata
  return isStringArray(tags) && tags.length > 0 ? tags : null
}

/**
 * Classifies one workspace project directory.
 * @param {string} workspaceFolder - Top-level folder name (`apps` or `libs`).
 * @param {string} absoluteFolder - Absolute path of that folder.
 * @param {import("node:fs").Dirent} entry - Directory entry to classify.
 * @returns {{ root: string, tags: readonly string[] } | null} Project
 * classification, or null for directories outside boundary enforcement.
 */
const resolveProject = (workspaceFolder, absoluteFolder, entry) => {
  const projectRoot = `${workspaceFolder}/${entry.name}`
  const packageJson = path.join(absoluteFolder, entry.name, "package.json")
  const projectJson = path.join(absoluteFolder, entry.name, "project.json")
  const fallback = fallbackTags[projectRoot]
  // Manifest-less libraries (plain .mjs sources) still need boundary
  // enforcement, so an explicit fallback classification is enough to
  // include them. Skipping on the manifest check alone would silently
  // exempt them from libraries-do-not-import-applications.
  if (
    !(fs.existsSync(packageJson) || fs.existsSync(projectJson)) &&
    (fallback === undefined || fallback.length === 0)
  ) {
    return null
  }

  /** @type {unknown} */
  const metadata = fs.existsSync(projectJson)
    ? JSON.parse(fs.readFileSync(projectJson, "utf-8"))
    : {}
  const tags = readManifestTags(metadata) ?? fallback

  if (tags === undefined || tags.length === 0) {
    throw new Error(
      `${projectRoot} needs Nx tags or a dependency-cruiser fallback classification`,
    )
  }

  return { root: projectRoot, tags }
}

const readProjects = () => {
  /** @type {{ root: string, tags: readonly string[] }[]} */
  const projects = []

  for (const workspaceFolder of workspaceFolders) {
    const absoluteFolder = path.join(workspaceRoot, workspaceFolder)
    for (const entry of fs.readdirSync(absoluteFolder, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) {
        continue
      }

      const project = resolveProject(workspaceFolder, absoluteFolder, entry)
      if (project !== null) {
        projects.push(project)
      }
    }
  }

  return projects
}

const projects = readProjects()
/**
 * @param {string} value - Literal project path fragment.
 * @returns {string} The fragment with regex metacharacters escaped.
 */
const escapeRegex = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")
/**
 * @param {string} tag - Nx tag to match.
 * @returns {string[]} Roots of projects carrying that tag.
 */
const rootsWithTag = (tag) => {
  /** @type {string[]} */
  const roots = []
  for (const project of projects) {
    if (project.tags.includes(tag)) {
      roots.push(project.root)
    }
  }
  return roots
}
/**
 * @param {readonly string[]} roots - Project roots to alternate over.
 * @returns {string} Anchored regex source matching files under those roots.
 */
const projectPattern = (roots) =>
  roots.length === 0
    ? "(?!)"
    : `^(?:${roots.map(escapeRegex).join("|")})(?:/|$)`

const appRoots = rootsWithTag(TYPE_APP)
const libraryRoots = rootsWithTag(TYPE_LIB)
const webRoots = rootsWithTag(PLATFORM_WEB)
const backendRoots = rootsWithTag("platform:backend")
const nextRoots = rootsWithTag(FRAMEWORK_NEXT)
const reactRoots = rootsWithTag("framework:react")
const medusaRoots = rootsWithTag("framework:medusa")
const agnosticRoots = rootsWithTag(FRAMEWORK_AGNOSTIC)

const allowedWebPattern = projectPattern([
  ...webRoots,
  ...rootsWithTag(PLATFORM_SHARED),
])
const allowedBackendPattern = projectPattern([
  ...backendRoots,
  ...rootsWithTag(PLATFORM_SHARED),
])
const allowedNextPattern = projectPattern([
  ...nextRoots,
  ...reactRoots,
  ...agnosticRoots,
])
const allowedReactPattern = projectPattern([...reactRoots, ...agnosticRoots])
const allowedMedusaPattern = projectPattern([...medusaRoots, ...agnosticRoots])
const allowedAgnosticPattern = projectPattern(agnosticRoots)

module.exports = {
  forbidden: [
    ...appRoots.map((appRoot) => ({
      comment:
        "Application projects may only import their own files or workspace libraries.",
      from: { path: projectPattern([appRoot]) },
      name: `app-depends-on-libraries-${appRoot.replaceAll("/", "-")}`,
      severity: "error",
      to: {
        path: WORKSPACE_SOURCE_PATTERN,
        pathNot: projectPattern([appRoot, ...libraryRoots]),
      },
    })),
    {
      comment: "Libraries must not depend on deployable applications.",
      from: { path: projectPattern(libraryRoots) },
      name: "libraries-do-not-import-applications",
      severity: "error",
      to: { path: projectPattern(appRoots) },
    },
    {
      from: { path: projectPattern(webRoots) },
      name: "web-does-not-import-backend",
      severity: "error",
      to: { path: WORKSPACE_SOURCE_PATTERN, pathNot: allowedWebPattern },
    },
    {
      from: { path: projectPattern(backendRoots) },
      name: "backend-does-not-import-web",
      severity: "error",
      to: { path: WORKSPACE_SOURCE_PATTERN, pathNot: allowedBackendPattern },
    },
    {
      from: { path: projectPattern(nextRoots) },
      name: "next-framework-boundaries",
      severity: "error",
      to: { path: WORKSPACE_SOURCE_PATTERN, pathNot: allowedNextPattern },
    },
    {
      from: { path: projectPattern(reactRoots) },
      name: "react-framework-boundaries",
      severity: "error",
      to: { path: WORKSPACE_SOURCE_PATTERN, pathNot: allowedReactPattern },
    },
    {
      from: { path: projectPattern(medusaRoots) },
      name: "medusa-framework-boundaries",
      severity: "error",
      to: { path: WORKSPACE_SOURCE_PATTERN, pathNot: allowedMedusaPattern },
    },
    {
      from: { path: projectPattern(agnosticRoots) },
      name: "agnostic-framework-boundaries",
      severity: "error",
      to: { path: WORKSPACE_SOURCE_PATTERN, pathNot: allowedAgnosticPattern },
    },
  ],
  options: {
    doNotFollow: {
      dependencyTypes: [
        "npm",
        "npm-dev",
        "npm-optional",
        "npm-peer",
        "npm-bundled",
        "npm-no-pkg",
      ],
      path: "node_modules",
    },
    enhancedResolveOptions: {
      conditionNames: ["types", "import", "require", "node", "default"],
      exportsFields: ["exports"],
    },
    exclude:
      "(^|/)(?:node_modules|dist|coverage|storybook-static|playwright-report|test-results|\\.next|\\.medusa)(?:/|$)|(?:^|/)payload-types\\.ts$|(?:^|/)importMap\\.js$",
    parser: "swc",
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}
