#!/usr/bin/env node
// Scaffold a new UltraModern.js app in apps/<slug> with the TechSio Design System.
//
//   pnpm create-app "AppName" [--no-branch] [--no-install] [--no-verify]
//
// Steps:
//   1. create a `feat/<slug>-init` branch (skip with --no-branch)
//   2. run the official UltraModern.js generator (presetUltramodern workspace)
//      with the TechSio overlay from scripts/ultramodern-overlay: @techsio/ui-kit,
//      app shell with Sidebar navigation, Business theme with brand and
//      light/dark switching, cs/en locales
//   3. install, regenerate route metadata and run the workspace `check`
//      (--no-install stops after generating; --no-verify after installing)
//   4. commit the scaffold and run the production `build`, which needs a clean
//      Git tree (skipped with --no-branch)
//
// The newest generator and UI-kit releases are tried first. If they fail
// verification, the app is regenerated on the known-good versions below and
// the failing versions are reported. Node.js is provisioned by pnpm
// (`node@runtime:`), so no global Node.js 26 or mise install is required.
//
// Runs on Node.js 24+ type stripping: keep the syntax erasable (no enums).

import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"

const ROOT = join(import.meta.dirname, "..")
const OVERLAY = join(import.meta.dirname, "ultramodern-overlay")
const GENERATOR = "@bleedingdev/modern-js-ultramodern-create"
const SHELL_APP = "shell-super-app"
const NAME_RE = /^[A-Za-z][A-Za-z0-9 _-]*$/
const CAMEL_BOUNDARY_RE = /([a-z0-9])([A-Z])/g
const NON_ALPHANUMERIC_RE = /[^a-z0-9]+/g
const EDGE_DASHES_RE = /^-+|-+$/g
const MAJOR_VERSION_RE = /\d+/
const USAGE =
  'Usage: pnpm create-app "AppName" [--no-branch] [--no-install] [--no-verify]'

// Last versions verified together; bump after a successful `pnpm create-app`.
const KNOWN_GOOD: Versions = {
  generator: "3.9.3-ultramodern.9",
  uiKit: "0.57.0",
}

type Versions = { generator: string; uiKit?: string }

type Options = {
  title: string
  slug: string
  appPath: string
  appDir: string
  /** Create a branch, commit the scaffold and run the production build. */
  commits: boolean
  install: boolean
  verify: boolean
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
    .replace(CAMEL_BOUNDARY_RE, "$1-$2")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RE, "-")
    .replace(EDGE_DASHES_RE, "")
}

function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
) {
  console.log(`$ ${command} ${args.join(" ")}`)
  return spawnSync(command, args, { cwd, env, stdio: "inherit" }).status === 0
}

function output(command: string, args: string[]) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim()
}

function npmView(spec: string, field: string) {
  return output("npm", ["view", spec, field])
}

function parseOptions(): Options {
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
      `${USAGE}\n  The name must start with a letter and contain only letters, digits, spaces, '-' or '_'.`
    )
  }

  const slug = toSlug(title)
  const install = !values["no-install"]
  return {
    title,
    slug,
    appPath: `apps/${slug}`,
    appDir: join(ROOT, "apps", slug),
    commits: !values["no-branch"],
    install,
    verify: install && !values["no-verify"],
  }
}

function preflight(options: Options) {
  if (existsSync(options.appDir)) {
    fail(`${options.appPath} already exists`)
  }
  if (options.verify && output("git", ["status", "--porcelain"]) !== "") {
    fail(
      "The Git working tree must be clean: the production build only runs on a committed tree.\n" +
        "  Commit or stash your changes, or pass --no-verify."
    )
  }
  if (options.commits) {
    step(`Creating branch feat/${options.slug}-init`)
    if (!run("git", ["switch", "-c", `feat/${options.slug}-init`], ROOT)) {
      fail("Could not create the branch (pass --no-branch to skip)")
    }
  }
}

/** Major Node.js version that satisfies the generator's `engines.node`. */
function generatorNodeMajor(version: string) {
  const engines = npmView(`${GENERATOR}@${version}`, "engines.node")
  const major = engines.match(MAJOR_VERSION_RE)?.[0]
  if (!major) {
    fail(`Cannot read engines.node of ${GENERATOR}@${version}`)
  }
  return major
}

function generate(options: Options, versions: Versions) {
  step(
    `Generating ${options.appPath} with ${GENERATOR}@${versions.generator}` +
      ` and @techsio/ui-kit@${versions.uiKit ?? "latest"}`
  )
  rmSync(options.appDir, { force: true, recursive: true })
  const env = {
    ...process.env,
    TECHSIO_APP_TITLE: options.title,
    ...(versions.uiKit ? { TECHSIO_UI_KIT_VERSION: versions.uiKit } : {}),
  }
  const generated = run(
    "pnpm",
    [
      `--package=node@runtime:${generatorNodeMajor(versions.generator)}`,
      `--package=${GENERATOR}@${versions.generator}`,
      "dlx",
      "ultramodern-create",
      options.slug,
      "--codesmith-overlay",
      OVERLAY,
    ],
    join(ROOT, "apps"),
    env
  )
  if (!generated) {
    fail(`The UltraModern.js generator failed for ${options.appPath}`)
  }
}

function installAndCheck(appDir: string) {
  step("Installing and checking the workspace")
  return (
    run("pnpm", ["install"], appDir) &&
    run(
      "pnpm",
      [
        "exec",
        "ultramodern-create",
        "ultramodern",
        "routes-generate",
        "--app",
        SHELL_APP,
        "--manifest-only",
      ],
      appDir
    ) &&
    run("pnpm", ["check"], appDir)
  )
}

/** Commit the scaffold; later attempts amend it so the branch keeps one commit. */
function commitScaffold(options: Options, amend: boolean) {
  step(amend ? "Amending the scaffold commit" : "Committing the scaffold")
  const message = `feat(apps): scaffold ${options.slug} on UltraModern.js with the TechSio Design System`
  const committed =
    run("git", ["add", "--all", options.appPath], ROOT) &&
    run(
      "git",
      amend ? ["commit", "--amend", "--no-edit"] : ["commit", "-m", message],
      ROOT
    )
  if (!committed) {
    fail("Could not commit the scaffold")
  }
}

function readDevPort(appDir: string) {
  try {
    const overlay = JSON.parse(
      readFileSync(
        join(appDir, "topology/local-overlays/development.json"),
        "utf8"
      )
    ) as { ports?: Record<string, number> }
    return overlay.ports?.[SHELL_APP]
  } catch {
    return
  }
}

function installedUiKit(appDir: string) {
  const manifest = JSON.parse(
    readFileSync(join(appDir, "apps", SHELL_APP, "package.json"), "utf8")
  ) as { dependencies?: Record<string, string> }
  return manifest.dependencies?.["@techsio/ui-kit"]
}

function reportSuccess(
  options: Options,
  versions: Versions,
  failures: string[]
) {
  const port = readDevPort(options.appDir)
  const lines = [
    `\n✔ Created ${options.appPath} (UltraModern.js ${versions.generator}, @techsio/ui-kit ${installedUiKit(options.appDir)}).`,
  ]
  if (!options.commits) {
    lines.push(
      "  The production build was skipped: it needs the scaffold committed."
    )
  }
  if (failures.length > 0) {
    lines.push(
      `  Rolled back from versions that failed verification: ${failures.join("; ")}`
    )
  }
  lines.push(
    `  Next: cd ${options.appPath} && pnpm dev${port ? `  (http://localhost:${port}/en)` : ""}`
  )
  console.log(lines.join("\n"))
}

/** Check, then (when committing) commit and build. Returns whether it passed. */
function verifyAttempt(options: Options, amend: boolean) {
  if (!installAndCheck(options.appDir)) {
    return false
  }
  if (!options.commits) {
    return true
  }
  commitScaffold(options, amend)
  step("Building for production")
  return run("pnpm", ["build"], options.appDir)
}

function main() {
  const options = parseOptions()
  preflight(options)

  if (!options.verify) {
    generate(options, { generator: npmView(GENERATOR, "dist-tags.latest") })
    const installed =
      options.install && run("pnpm", ["install"], options.appDir)
    const next = installed ? "pnpm dev" : "pnpm install"
    console.log(
      `\n✔ Created ${options.appPath} (not verified). Next: cd ${options.appPath} && ${next}`
    )
    return
  }

  // The latest attempt leaves the UI-kit version to the overlay (newest release
  // outside the 24h minimumReleaseAge); the fallback pins both.
  const attempts: Versions[] = [
    { generator: npmView(GENERATOR, "dist-tags.latest") },
    KNOWN_GOOD,
  ]
  const failures: string[] = []
  for (const versions of attempts) {
    generate(options, versions)
    // A commit exists once an earlier attempt got past `check`.
    const amend = options.commits && failures.length > 0 && hasScaffoldCommit()
    if (verifyAttempt(options, amend)) {
      reportSuccess(options, versions, failures)
      return
    }
    failures.push(
      `${GENERATOR}@${versions.generator} + @techsio/ui-kit@${installedUiKit(options.appDir)}`
    )
  }

  fail(
    `${options.appPath} fails verification even on the known-good versions (${failures.join("; ")}).\n` +
      "  Fix scripts/ultramodern-overlay or update KNOWN_GOOD in scripts/create-app.mts."
  )

  function hasScaffoldCommit() {
    return output("git", ["log", "-1", "--format=%s"]).startsWith(
      `feat(apps): scaffold ${options.slug} `
    )
  }
}

main()
