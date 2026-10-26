#!/usr/bin/env node
// Scaffold a new frontend app in apps/<slug> from apps/frontend-template.
//
//   pnpm create-app "AppName" [--no-branch] [--no-install] [--no-verify]
//
// Steps:
//   1. create a `feat/<slug>-init` branch (skip with --no-branch)
//   2. copy the template's git-tracked files and rename the app
//   3. pin Node.js to the current LTS major (.node-version, engines, @types/node)
//   4. upgrade every other dependency to its latest release; the template's
//      pnpm minimumReleaseAge still applies (skip install with --no-install)
//   5. format, check and build (skip with --no-verify)
//
// If the upgraded app fails step 5, the template's known-good package.json and
// lockfile are restored, verified again, and the failing upgrade set is reported.
//
// Runs on Node.js 24+ type stripping: keep the syntax erasable (no enums).

import { execFileSync, spawnSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative } from "node:path"
import { parseArgs } from "node:util"

const ROOT = join(import.meta.dirname, "..")
const TEMPLATE = "apps/frontend-template"
const NODE_INDEX_URL = "https://nodejs.org/dist/index.json"
const NAME_RE = /^[A-Za-z][A-Za-z0-9 _-]*$/

type PackageJson = {
  name: string
  engines?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

function fail(message: string): never {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function step(message: string) {
  console.log(`\n▸ ${message}`)
}

/** "AppName" -> "app-name", "My Shop 2" -> "my-shop-2" */
function toSlug(name: string) {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function run(command: string, args: string[], cwd: string) {
  console.log(`$ ${command} ${args.join(" ")}`)
  return spawnSync(command, args, { cwd, stdio: "inherit" }).status === 0
}

function runAll(commands: [string, string[]][], cwd: string) {
  return commands.every(([command, args]) => run(command, args, cwd))
}

function copyTrackedTemplate(target: string) {
  const files = execFileSync("git", ["ls-files", "-z", TEMPLATE], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)

  if (files.length === 0) {
    fail(`${TEMPLATE} has no tracked files`)
  }

  for (const file of files) {
    const source = join(ROOT, file)
    const destination = join(target, relative(TEMPLATE, file))
    mkdirSync(dirname(destination), { recursive: true })

    if (lstatSync(source).isSymbolicLink()) {
      symlinkSync(readlinkSync(source), destination)
    } else {
      copyFileSync(source, destination)
    }
  }

  return files.length
}

/** Replace text that must exist in the template, so template drift fails loudly. */
function replaceIn(appDir: string, file: string, from: string, to: string) {
  const path = join(appDir, file)
  const content = readFileSync(path, "utf8")

  if (!content.includes(from)) {
    fail(`${TEMPLATE}/${file} no longer contains ${JSON.stringify(from)}`)
  }

  writeFileSync(path, content.replaceAll(from, to))
}

function readPackageJson(appDir: string): PackageJson {
  return JSON.parse(readFileSync(join(appDir, "package.json"), "utf8"))
}

function writePackageJson(appDir: string, pkg: PackageJson) {
  writeFileSync(
    join(appDir, "package.json"),
    `${JSON.stringify(pkg, null, 2)}\n`
  )
}

function renameApp(appDir: string, slug: string, title: string) {
  writePackageJson(appDir, { ...readPackageJson(appDir), name: slug })
  replaceIn(
    appDir,
    "src/app/layout.tsx",
    `title: "TechSio Frontend Template"`,
    `title: "${title}"`
  )
  replaceIn(appDir, "src/app/page.tsx", ">Frontend template<", `>${title}<`)
  replaceIn(appDir, "README.md", "# Frontend Template", `# ${title}`)
  replaceIn(
    appDir,
    "AGENTS.md",
    "# Frontend Template Guidelines",
    `# ${title} Guidelines`
  )
  replaceIn(appDir, "AGENTS.md", `\`${TEMPLATE}\``, `\`apps/${slug}\``)
  replaceIn(
    appDir,
    "AGENTS.md",
    `- This is the source template for \`pnpm create-app "AppName"\` (see
  \`scripts/create-app.mts\`). Changes here apply to every app generated later.`,
    `- Generated from \`${TEMPLATE}\` by \`pnpm create-app\`.`
  )
}

async function resolveNodeLtsMajor() {
  try {
    const response = await fetch(NODE_INDEX_URL)
    const releases = (await response.json()) as {
      version: string
      lts: string | false
    }[]
    const latestLts = releases.find((release) => release.lts)

    return latestLts?.version.slice(1).split(".")[0] ?? null
  } catch {
    return null
  }
}

function pinNodeLts(appDir: string, major: string) {
  writeFileSync(join(appDir, ".node-version"), `${major}\n`)
  const pkg = readPackageJson(appDir)
  writePackageJson(appDir, {
    ...pkg,
    engines: { ...pkg.engines, node: `>=${major}` },
  })
}

function dependencyVersions(appDir: string) {
  const pkg = readPackageJson(appDir)
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

function describeUpgrades(
  before: Record<string, string>,
  after: Record<string, string>
) {
  return Object.keys(after)
    .filter((name) => before[name] !== after[name])
    .map((name) => `  ${name}: ${before[name] ?? "(new)"} -> ${after[name]}`)
}

const VERIFY: [string, string[]][] = [
  ["pnpm", ["format"]],
  ["pnpm", ["check"]],
  ["pnpm", ["build"]],
]

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      "no-branch": { type: "boolean", default: false },
      "no-install": { type: "boolean", default: false },
      "no-verify": { type: "boolean", default: false },
    },
  })

  const title = positionals.join(" ").trim()
  if (!NAME_RE.test(title)) {
    fail(
      'Usage: pnpm create-app "AppName" [--no-branch] [--no-install] [--no-verify]\n' +
        "  The name must start with a letter and contain only letters, digits, spaces, '-' or '_'."
    )
  }

  const slug = toSlug(title)
  const appPath = `apps/${slug}`
  const appDir = join(ROOT, appPath)

  if (existsSync(appDir)) {
    fail(`${appPath} already exists`)
  }

  if (!values["no-branch"]) {
    step(`Creating branch feat/${slug}-init`)
    if (!run("git", ["switch", "-c", `feat/${slug}-init`], ROOT)) {
      fail("Could not create the branch (pass --no-branch to skip)")
    }
  }

  step(`Copying ${TEMPLATE} -> ${appPath}`)
  console.log(`  ${copyTrackedTemplate(appDir)} files`)
  renameApp(appDir, slug, title)

  step("Resolving the Node.js LTS release")
  const nodeMajor = await resolveNodeLtsMajor()
  if (nodeMajor) {
    pinNodeLts(appDir, nodeMajor)
    console.log(`  Node.js ${nodeMajor} (LTS)`)
  } else {
    console.warn("  Could not reach nodejs.org; keeping the template's Node.js")
  }

  if (values["no-install"]) {
    console.log(`\n✔ Created ${appPath}. Next: cd ${appPath} && pnpm install`)
    return
  }

  const knownGoodPackageJson = readFileSync(join(appDir, "package.json"))
  const knownGoodLockfile = readFileSync(join(appDir, "pnpm-lock.yaml"))
  const before = dependencyVersions(appDir)

  step("Upgrading dependencies to their latest releases")
  const typesNode = nodeMajor ? `@types/node@${nodeMajor}` : "@types/node"
  const upgraded = runAll(
    [
      ["pnpm", ["update", "--latest", "!@types/node"]],
      ["pnpm", ["add", "--save-dev", typesNode]],
    ],
    appDir
  )
  if (!upgraded) {
    fail(`Dependency upgrade failed in ${appPath}`)
  }

  const after = dependencyVersions(appDir)
  const upgrades = describeUpgrades(before, after)
  const upgradeSummary =
    upgrades.length > 0
      ? upgrades.join("\n")
      : "  (no direct dependency changes; only transitive lockfile updates)"
  console.log(upgradeSummary)

  if (values["no-verify"]) {
    console.log(
      `\n✔ Created ${appPath} (not verified). Next: cd ${appPath} && pnpm dev`
    )
    return
  }

  step("Verifying the upgraded app (format, check, build)")
  if (runAll(VERIFY, appDir)) {
    console.log(`\n✔ Created ${appPath}. Next: cd ${appPath} && pnpm dev`)
    return
  }

  step("Upgraded app failed verification; restoring the template's versions")
  writeFileSync(join(appDir, "package.json"), knownGoodPackageJson)
  writeFileSync(join(appDir, "pnpm-lock.yaml"), knownGoodLockfile)

  const restored = runAll(
    [["pnpm", ["install", "--frozen-lockfile"]], ...VERIFY],
    appDir
  )
  if (!restored) {
    fail(
      `${appPath} also fails with the template's versions; fix ${TEMPLATE} first`
    )
  }

  console.log(
    `\n✔ Created ${appPath} on the template's versions.\n` +
      "  These upgrades broke format, check or build and were rolled back:\n" +
      `${upgradeSummary}\n` +
      `  Next: cd ${appPath} && pnpm dev`
  )
}

await main()
