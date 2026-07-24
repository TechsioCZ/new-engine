#!/usr/bin/env node
// Pre-commit gate: keep every opted-in UI component 1:1 with its usage skill's version, and require
// a Storybook changelog entry (plus a version bump when the component's code changes).
//
// A component opts in by carrying `@componentVersion vX.Y.Z` and `@skill <name>` in its file header.
// Components without those tags are skipped, so the convention can roll out one component at a time.
//
// For each opted-in component in the commit:
//   - the paired skill `libs/ui/skills/<name>/SKILL.md` must declare `component_version: X.Y.Z`
//   - the component `@componentVersion` must equal that `component_version`      (the 1:1 tie)
//   - the changelog story must contain a `### <Component> vX.Y.Z` entry for that version
//   - if the component's code changed vs the merge-base but the version did not, fail
//
// Reads staged content from the git index, so it validates exactly what is being committed.

import { execFileSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

const SKILLS_DIR = "libs/ui/skills"
// The plugin bundle is generated from SKILLS_DIR by sync-skills.mjs. It is committed, so a stale
// copy would ship wrong version metadata to plugin consumers — check it too.
const PLUGIN_SKILLS_DIR = "libs/ui/agent-plugin/skills"
const SYNC_CMD = "node libs/ui/agent-plugin/scripts/sync-skills.mjs"
const COMPONENT_DIRS = ["atoms", "molecules", "organisms", "templates"].map(
  (d) => `libs/ui/src/${d}`
)
const CHANGELOG = "libs/ui/stories/changelog/changelog.stories.tsx"
const COMPONENT_RE =
  /^libs\/ui\/src\/(atoms|molecules|organisms|templates)\/[^/]+\.tsx$/
const VERSION_RE = /@componentVersion\s+v?(\d+\.\d+\.\d+)/
const SKILL_TAG_RE = /@skill\s+([a-z0-9-]+)/
const COMPONENT_TAG_RE = /@component\s+([A-Za-z0-9]+)/
const SKILL_VERSION_RE =
  /^component_version:\s*["']?v?(\d+\.\d+\.\d+)["']?\s*$/m

const git = (args) => {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

// Staged content of a path, read STRICTLY from the index — this gate asserts the state of the
// commit being made, so an unstaged working-tree edit (file modified but not `git add`ed, or
// deleted from the index) must read as absent rather than silently validating content that will
// not be committed. `git show :<path>` returns "" for a path missing from the index.
const readStaged = (path) => git(["show", `:${path}`])

const baselineRef = () => {
  for (const base of ["origin/master", "master", "origin/main", "main"]) {
    const mb = git(["merge-base", "HEAD", base])
    if (mb) return mb
  }
  return ""
}

const pascalFromFile = (file) =>
  file
    .replace(/^.*\//, "")
    .replace(/\.tsx$/, "")
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")

// Drop the metadata tag lines so a pure version/skill bump is not itself seen as a code change.
const stripMeta = (src) =>
  src
    .split("\n")
    .filter((l) => !/@componentVersion|@skill\b|@component\b/.test(l))
    .join("\n")

const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
  .split("\n")
  .filter(Boolean)
const stagedSet = new Set(staged)

const isComponentPath = (f) => COMPONENT_RE.test(f) && !f.endsWith(".figma.tsx")

// Every opted-in component in the tree, so a commit that touches only a skill or the changelog
// still resolves back to the components it affects instead of silently passing.
const optedInComponents = () => {
  const out = []
  for (const dir of COMPONENT_DIRS) {
    let entries = []
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.endsWith(".tsx") || entry.endsWith(".figma.tsx")) continue
      const file = `${dir}/${entry}`
      const src = readStaged(file)
      if (VERSION_RE.test(src) && SKILL_TAG_RE.test(src)) out.push(file)
    }
  }
  return out
}

// Staged components, plus any opted-in component whose skill (source or bundle) is staged, plus
// every opted-in component when the changelog itself changed.
const toCheck = new Set(staged.filter(isComponentPath))
const changelogStaged = stagedSet.has(CHANGELOG)
for (const file of optedInComponents()) {
  const skillName = readStaged(file).match(SKILL_TAG_RE)?.[1]
  if (!skillName) continue
  const skillTouched =
    stagedSet.has(join(SKILLS_DIR, skillName, "SKILL.md")) ||
    stagedSet.has(join(PLUGIN_SKILLS_DIR, skillName, "SKILL.md"))
  if (skillTouched || changelogStaged) toCheck.add(file)
}

const errors = []
const base = baselineRef()

for (const file of toCheck) {
  const src = readStaged(file)
  const vMatch = src.match(VERSION_RE)
  const sMatch = src.match(SKILL_TAG_RE)

  if (!(vMatch || sMatch)) continue // not opted in yet — skip

  const label = file.replace(/^libs\/ui\/src\//, "")
  if (!(vMatch && sMatch)) {
    errors.push(
      `${label}: has one of @componentVersion/@skill but not both — add both to opt in.`
    )
    continue
  }

  const version = vMatch[1]
  const skillName = sMatch[1]
  const skillPath = join(SKILLS_DIR, skillName, "SKILL.md")

  if (!existsSync(skillPath)) {
    errors.push(`${label}: @skill ${skillName} → ${skillPath} does not exist.`)
    continue
  }

  const skillVMatch = readStaged(skillPath).match(SKILL_VERSION_RE)
  if (!skillVMatch) {
    errors.push(
      `${skillPath}: missing \`component_version:\` (must equal ${label} @componentVersion v${version}).`
    )
  } else if (skillVMatch[1] !== version) {
    errors.push(
      `${label}: component v${version} ≠ ${skillName} component_version v${skillVMatch[1]} — must match 1:1.`
    )
  }

  // The committed plugin bundle is generated from the source skill — a stale copy would ship wrong
  // version metadata to standalone plugin consumers.
  const bundledPath = join(PLUGIN_SKILLS_DIR, skillName, "SKILL.md")
  if (existsSync(bundledPath)) {
    const bundledV = readStaged(bundledPath).match(SKILL_VERSION_RE)?.[1]
    if (bundledV !== version) {
      errors.push(
        `${bundledPath}: component_version v${bundledV ?? "—"} is stale (expected v${version}) — run \`${SYNC_CMD}\`.`
      )
    }
  } else {
    errors.push(
      `${bundledPath} missing — run \`${SYNC_CMD}\` to bundle ${skillName}.`
    )
  }

  const componentName = src.match(COMPONENT_TAG_RE)?.[1] || pascalFromFile(file)
  const changelog = readStaged(CHANGELOG)
  const entryRe = new RegExp(
    `^###\\s+${componentName}\\s+v${version.replace(/\./g, "\\.")}\\s*$`,
    "im"
  )
  if (!changelog) {
    errors.push(
      `${CHANGELOG} not found — add a \`### ${componentName} v${version}\` entry.`
    )
  } else if (!entryRe.test(changelog)) {
    errors.push(
      `${CHANGELOG}: missing \`### ${componentName} v${version}\` — document this version's change.`
    )
  }

  // Bump check: code changed vs the baseline but the version is unchanged.
  if (base) {
    const baseSrc = git(["show", `${base}:${file}`])
    const baseV = baseSrc.match(VERSION_RE)?.[1]
    if (
      baseSrc &&
      baseV &&
      baseV === version &&
      stripMeta(baseSrc) !== stripMeta(src)
    ) {
      errors.push(
        `${label}: code changed but @componentVersion is still v${version} — bump it (and its skill + changelog).`
      )
    }
  }
}

if (errors.length) {
  process.stderr.write("\n✖ skill-sync: component ↔ skill version mismatch\n\n")
  for (const e of errors) process.stderr.write(`  • ${e}\n`)
  process.stderr.write(
    "\nUpdate the component, its libs/ui/skills/<name>/SKILL.md, and the changelog story together, then re-stage.\n\n"
  )
  process.exit(1)
}

process.exit(0)
