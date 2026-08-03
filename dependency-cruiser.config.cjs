const fs = require("node:fs")
const path = require("node:path")
const swc = require("@swc/core")

const workspaceRoot = __dirname

// dependency-cruiser 18 supports TypeScript <7 through tsc. Use its supported
// SWC parser for TypeScript 7, while supplying the TSX flag its parser omits.
const parseFileSync = swc.parseFileSync
swc.parseFileSync = (fileName, options) =>
  parseFileSync(fileName, {
    ...options,
    tsx: /\.[cm]?[jt]sx$/u.test(fileName),
  })
const workspaceFolders = ["apps", "libs"]

const fallbackTags = {
  "apps/herbatika": ["type:app", "platform:web", "framework:next"],
  "apps/payload": ["type:app", "platform:web", "framework:next"],
  "apps/smart-suggest": ["type:app", "platform:web", "framework:next"],
  "libs/smart-suggest": ["type:lib", "platform:web", "framework:react"],
  "libs/std": ["type:lib", "platform:shared", "framework:agnostic"],
  "libs/storefront-data": ["type:lib", "platform:shared", "framework:agnostic"],
  "libs/storefront-security": [
    "type:lib",
    "platform:shared",
    "framework:agnostic",
  ],
}

function readProjects() {
  const projects = []

  for (const workspaceFolder of workspaceFolders) {
    const absoluteFolder = path.join(workspaceRoot, workspaceFolder)
    for (const entry of fs.readdirSync(absoluteFolder, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue

      const projectRoot = `${workspaceFolder}/${entry.name}`
      const packageJson = path.join(absoluteFolder, entry.name, "package.json")
      const projectJson = path.join(absoluteFolder, entry.name, "project.json")
      if (!(fs.existsSync(packageJson) || fs.existsSync(projectJson))) continue

      const metadata = fs.existsSync(projectJson)
        ? JSON.parse(fs.readFileSync(projectJson, "utf8"))
        : {}
      const tags = metadata.tags?.length
        ? metadata.tags
        : fallbackTags[projectRoot]

      if (!tags?.length) {
        throw new Error(
          `${projectRoot} needs Nx tags or a dependency-cruiser fallback classification`
        )
      }

      projects.push({ root: projectRoot, tags })
    }
  }

  return projects
}

const projects = readProjects()
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const rootsWithTag = (tag) =>
  projects.filter(({ tags }) => tags.includes(tag)).map(({ root }) => root)
const projectPattern = (roots) =>
  roots.length === 0
    ? "(?!)"
    : `^(?:${roots.map(escapeRegex).join("|")})(?:/|$)`

const appRoots = rootsWithTag("type:app")
const libraryRoots = rootsWithTag("type:lib")
const webRoots = rootsWithTag("platform:web")
const backendRoots = rootsWithTag("platform:backend")
const nextRoots = rootsWithTag("framework:next")
const reactRoots = rootsWithTag("framework:react")
const medusaRoots = rootsWithTag("framework:medusa")
const agnosticRoots = rootsWithTag("framework:agnostic")

const allowedWebPattern = projectPattern([
  ...webRoots,
  ...rootsWithTag("platform:shared"),
])
const allowedBackendPattern = projectPattern([
  ...backendRoots,
  ...rootsWithTag("platform:shared"),
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
      name: `app-depends-on-libraries-${appRoot.replaceAll("/", "-")}`,
      severity: "error",
      comment:
        "Application projects may only import their own files or workspace libraries.",
      from: { path: projectPattern([appRoot]) },
      to: {
        path: "^(?:apps|libs)/",
        pathNot: projectPattern([appRoot, ...libraryRoots]),
      },
    })),
    {
      name: "libraries-do-not-import-applications",
      severity: "error",
      comment: "Libraries must not depend on deployable applications.",
      from: { path: projectPattern(libraryRoots) },
      to: { path: projectPattern(appRoots) },
    },
    {
      name: "web-does-not-import-backend",
      severity: "error",
      from: { path: projectPattern(webRoots) },
      to: { path: "^(?:apps|libs)/", pathNot: allowedWebPattern },
    },
    {
      name: "backend-does-not-import-web",
      severity: "error",
      from: { path: projectPattern(backendRoots) },
      to: { path: "^(?:apps|libs)/", pathNot: allowedBackendPattern },
    },
    {
      name: "next-framework-boundaries",
      severity: "error",
      from: { path: projectPattern(nextRoots) },
      to: { path: "^(?:apps|libs)/", pathNot: allowedNextPattern },
    },
    {
      name: "react-framework-boundaries",
      severity: "error",
      from: { path: projectPattern(reactRoots) },
      to: { path: "^(?:apps|libs)/", pathNot: allowedReactPattern },
    },
    {
      name: "medusa-framework-boundaries",
      severity: "error",
      from: { path: projectPattern(medusaRoots) },
      to: { path: "^(?:apps|libs)/", pathNot: allowedMedusaPattern },
    },
    {
      name: "agnostic-framework-boundaries",
      severity: "error",
      from: { path: projectPattern(agnosticRoots) },
      to: { path: "^(?:apps|libs)/", pathNot: allowedAgnosticPattern },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
      dependencyTypes: [
        "npm",
        "npm-dev",
        "npm-optional",
        "npm-peer",
        "npm-bundled",
        "npm-no-pkg",
      ],
    },
    exclude:
      "(^|/)(?:node_modules|dist|coverage|storybook-static|playwright-report|test-results|\\.next|\\.medusa)(?:/|$)|(?:^|/)payload-types\\.ts$|(?:^|/)importMap\\.js$",
    parser: "swc",
    enhancedResolveOptions: {
      conditionNames: ["types", "import", "require", "node", "default"],
      exportsFields: ["exports"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
}
