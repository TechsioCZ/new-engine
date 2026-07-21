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
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const SKILLS_DIR = "libs/ui/skills"
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

// Staged content of a path (from the index), falling back to the working tree.
const readStaged = (path) => {
  const fromIndex = git(["show", `:${path}`])
  if (fromIndex) return fromIndex
  try {
    return readFileSync(path, "utf8")
  } catch {
    return ""
  }
}

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
const components = staged.filter(
  (f) => COMPONENT_RE.test(f) && !f.endsWith(".figma.tsx")
)

const errors = []
const base = baselineRef()

for (const file of components) {
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
