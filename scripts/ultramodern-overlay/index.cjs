"use strict"
// CodeSmith overlay for UltraModern.js workspaces: adds the TechSio Design System
// (@techsio/ui-kit) app shell to the generated shell app.
//
//   pnpm dlx @bleedingdev/modern-js-ultramodern-create@<V> my-app \
//     --codesmith-overlay ./scripts/ultramodern-overlay
//
// `pnpm create-app` runs it for you. It only extends base generation: it adds
// files and dependencies and never touches the Platform Baseline pins.
//
// - copies `files/` over the shell app (layout, home page, settings route,
//   app shell with Sidebar navigation, theme and language switchers, UI-kit CSS)
// - merges `locales/<lng>.json` into the shell's `locales/<lng>/shell.json`
// - adds @techsio/ui-kit (newest release outside pnpm's 24h minimumReleaseAge)
//   and the tw-animate-css range it declares
// - sets `devEngines.runtime` to the Node.js version pinned in .mise.toml
//
// TECHSIO_UI_KIT_VERSION pins an exact UI-kit version instead, and
// TECHSIO_APP_TITLE replaces the shell title in every locale.

const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const UI_KIT = "@techsio/ui-kit"
// Known-good fallback when the registry cannot be reached.
const UI_KIT_FALLBACK = { version: "0.57.0", twAnimateCss: "^1.4.0" }
const RELEASE_AGE_MS = 24 * 60 * 60 * 1000
const STABLE_VERSION_RE = /^\d+\.\d+\.\d+$/
const MISE_NODE_RE = /^node\s*=\s*"([^"]+)"/m

function npmView(args) {
  return JSON.parse(
    execFileSync("npm", ["view", ...args, "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  )
}

function compareVersions(a, b) {
  const left = a.split(".").map(Number)
  const right = b.split(".").map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index]
    }
  }
  return 0
}

function resolveUiKit() {
  try {
    let version = process.env.TECHSIO_UI_KIT_VERSION
    if (!version) {
      const releasedBefore = Date.now() - RELEASE_AGE_MS
      const times = npmView([UI_KIT, "time"])
      version = Object.keys(times)
        .filter(
          (key) =>
            STABLE_VERSION_RE.test(key) &&
            Date.parse(times[key]) <= releasedBefore
        )
        .sort(compareVersions)
        .at(-1)
    }
    const dependencies = npmView([`${UI_KIT}@${version}`, "dependencies"])
    return { version, twAnimateCss: dependencies["tw-animate-css"] }
  } catch {
    return UI_KIT_FALLBACK
  }
}

function copyTree(source, target) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true })
      copyTree(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function deepMerge(base, extra) {
  const merged = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    merged[key] =
      isPlainObject(value) && isPlainObject(base[key])
        ? deepMerge(base[key], value)
        : value
  }
  return merged
}

function mergeLocales(appDir) {
  const localesDir = path.join(__dirname, "locales")
  const title = process.env.TECHSIO_APP_TITLE
  for (const file of fs.readdirSync(localesDir)) {
    const language = path.basename(file, ".json")
    const target = path.join(appDir, "locales", language, "shell.json")
    if (!fs.existsSync(target)) {
      throw new Error(`Missing generated locale file: ${target}`)
    }
    const extra = readJson(path.join(localesDir, file))
    if (title) {
      extra.shell.title = title
    }
    writeJson(target, deepMerge(readJson(target), extra))
  }
}

// Let pnpm provision the Node.js version the workspace pins in .mise.toml, so
// installs and scripts work without mise or a matching global Node.js.
function addNodeRuntime(workspaceRoot) {
  const mise = fs.readFileSync(path.join(workspaceRoot, ".mise.toml"), "utf8")
  const version = mise.match(MISE_NODE_RE)?.[1]
  if (!version) {
    throw new Error("[techsio-overlay] .mise.toml does not pin node")
  }
  const manifestPath = path.join(workspaceRoot, "package.json")
  const manifest = readJson(manifestPath)
  manifest.devEngines = {
    ...manifest.devEngines,
    runtime: { name: "node", onFail: "download", version },
  }
  writeJson(manifestPath, manifest)
}

function addDependencies(appDir) {
  const uiKit = resolveUiKit()
  const manifestPath = path.join(appDir, "package.json")
  const manifest = readJson(manifestPath)
  const dependencies = {
    ...manifest.dependencies,
    [UI_KIT]: uiKit.version,
    "tw-animate-css": uiKit.twAnimateCss,
  }
  manifest.dependencies = Object.fromEntries(
    Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b))
  )
  writeJson(manifestPath, manifest)
  console.log(`[techsio-overlay] ${UI_KIT}@${uiKit.version}`)
}

module.exports = function techsioUltramodernOverlay(context) {
  const config = context.config ?? {}
  if (config.operation !== "workspace") {
    return
  }

  const workspaceRoot = config.outputWorkspaceRoot ?? config.workspaceRoot
  const shell = (config.generatedApps ?? []).find((app) => app.kind === "shell")
  if (!(workspaceRoot && shell)) {
    throw new Error("[techsio-overlay] no generated shell app to extend")
  }
  if (shell.renderer !== "react") {
    throw new Error(
      "[techsio-overlay] @techsio/ui-kit needs the React renderer"
    )
  }

  const appDir = path.join(workspaceRoot, shell.directory)
  copyTree(path.join(__dirname, "files"), appDir)
  mergeLocales(appDir)
  addDependencies(appDir)
  addNodeRuntime(workspaceRoot)
}
