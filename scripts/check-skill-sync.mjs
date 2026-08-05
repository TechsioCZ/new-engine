#!/usr/bin/env node
/// <reference types="node" />

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
import path from "node:path"

const SKILLS_DIR = "libs/ui/skills"
// The plugin bundle is generated from SKILLS_DIR by sync-skills.mjs. It is committed, so a stale
// copy would ship wrong version metadata to plugin consumers — check it too.
const PLUGIN_SKILLS_DIR = "libs/ui/agent-plugin/skills"
const SYNC_CMD = "node libs/ui/agent-plugin/scripts/sync-skills.mjs"
const COMPONENT_DIRS = ["atoms", "molecules", "organisms", "templates"].map(
  (d) => `libs/ui/src/${d}`,
)
const CHANGELOG = "libs/ui/stories/changelog/changelog.stories.tsx"
const COMPONENT_RE =
  /^libs\/ui\/src\/(?:atoms|molecules|organisms|templates)\/[^/]+\.tsx$/u
const VERSION_RE = /@componentVersion\s+v?(?<version>\d+\.\d+\.\d+)/u
const SKILL_TAG_RE = /@skill\s+(?<skillName>[a-z0-9-]+)/u
const COMPONENT_TAG_RE = /@component\s+(?<componentName>[A-Za-z0-9]+)/u
const SKILL_VERSION_RE =
  /^component_version:\s*["']?v?(?<version>\d+\.\d+\.\d+)["']?\s*$/mu

/**
 * @param {string[]} args - Git arguments.
 * @returns {string} Trimmed command output, or an empty string on failure.
 */
const git = (args) => {
  try {
    return execFileSync("/usr/bin/git", args, {
      encoding: "utf-8",
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
/**
 * @param {string} filePath - Repository-relative path.
 * @returns {string} Staged file content, or an empty string when absent.
 */
const readStaged = (filePath) => git(["show", `:${filePath}`])

const baselineRef = () => {
  const candidates = ["origin/master", "master", "origin/main", "main"]
  // Also honour the remote's actual default branch, so a repo whose default is neither master nor
  // main doesn't silently skip the bump check below (baselineRef() returning "" disables it).
  const remoteHead = git([
    "symbolic-ref",
    "--short",
    "refs/remotes/origin/HEAD",
  ])
  if (remoteHead) {
    candidates.push(remoteHead)
  }
  for (const base of candidates) {
    const mb = git(["merge-base", "HEAD", base])
    if (mb) {
      return mb
    }
  }
  return ""
}

/**
 * @param {string} file - Component file path.
 * @returns {string} Pascal-cased component name.
 */
const pascalFromFile = (file) =>
  file
    .replace(/^.*\//u, "")
    .replace(/\.tsx$/u, "")
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("")

// Drop the metadata tag lines so a pure version/skill bump is not itself seen as a code change.
/**
 * @param {string} source - Component source.
 * @returns {string} Source without metadata lines.
 */
const stripMeta = (source) =>
  source
    .split("\n")
    .filter((line) => !/@componentVersion|@skill\b|@component\b/u.test(line))
    .join("\n")

// Include deletions (D): removing a component's SKILL.md, its generated bundle copy, or the
// changelog must still pull the component into the check set so the missing-artifact checks fire —
// otherwise the commit passes while the component points at a now-missing sync artifact.
const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMRD"])
  .split("\n")
  .filter(Boolean)
const stagedSet = new Set(staged)

/**
 * @param {string} file - Repository-relative path.
 * @returns {boolean} Whether the path is a checked component file.
 */
const isComponentPath = (file) =>
  COMPONENT_RE.test(file) && !file.endsWith(".figma.tsx")

// Every opted-in component in the tree, so a commit that touches only a skill or the changelog
// still resolves back to the components it affects instead of silently passing.
/**
 * @returns {string[]} Staged paths of opted-in components.
 */
const optedInComponents = () => {
  /** @type {string[]} */
  const out = []
  for (const dir of COMPONENT_DIRS) {
    /** @type {string[]} */
    let entries = []
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.endsWith(".tsx") || entry.endsWith(".figma.tsx")) {
        continue
      }
      const file = `${dir}/${entry}`
      const src = readStaged(file)
      if (VERSION_RE.test(src) && SKILL_TAG_RE.test(src)) {
        out.push(file)
      }
    }
  }
  return out
}

// Staged components, plus any opted-in component whose skill (source or bundle) is staged, plus
// every opted-in component when the changelog itself changed.
const toCheck = new Set(staged.filter(isComponentPath))
const changelogStaged = stagedSet.has(CHANGELOG)
for (const file of optedInComponents()) {
  const skillName = SKILL_TAG_RE.exec(readStaged(file))?.groups?.skillName
  if (skillName === undefined || skillName === "") {
    continue
  }
  const skillTouched =
    stagedSet.has(path.join(SKILLS_DIR, skillName, "SKILL.md")) ||
    stagedSet.has(path.join(PLUGIN_SKILLS_DIR, skillName, "SKILL.md"))
  if (skillTouched || changelogStaged) {
    toCheck.add(file)
  }
}

/** @type {string[]} */
const errors = []
const base = baselineRef()

/**
 * @typedef {object} ComponentMetadata
 * @property {string} label - Component path below the UI source directory.
 * @property {string} skillName - Paired skill name.
 * @property {string} version - Component version.
 */

/**
 * @param {string} file - Component file path.
 * @param {string} source - Staged component source.
 * @returns {ComponentMetadata | null} Parsed metadata, or null when validation must stop.
 */
const componentMetadata = (file, source) => {
  const versionMatch = VERSION_RE.exec(source)
  const skillMatch = SKILL_TAG_RE.exec(source)
  if (!(versionMatch || skillMatch)) {
    return null
  }

  const label = file.replace(/^libs\/ui\/src\//u, "")
  if (!(versionMatch && skillMatch)) {
    errors.push(
      `${label}: has one of @componentVersion/@skill but not both — add both to opt in.`,
    )
    return null
  }

  const version = versionMatch.groups?.version
  const skillName = skillMatch.groups?.skillName
  if (version === undefined || version === "") {
    errors.push(`${label}: has malformed component metadata.`)
    return null
  }
  if (skillName === undefined || skillName === "") {
    errors.push(`${label}: has malformed component metadata.`)
    return null
  }
  return { label, skillName, version }
}

/**
 * @param {ComponentMetadata} metadata - Parsed component metadata.
 * @returns {string | null} Existing skill path, or null when it is missing.
 */
const validateSkill = ({ label, skillName, version }) => {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md")
  if (!existsSync(skillPath)) {
    errors.push(`${label}: @skill ${skillName} → ${skillPath} does not exist.`)
    return null
  }

  const skillVersion = SKILL_VERSION_RE.exec(readStaged(skillPath))?.groups
    ?.version
  if (skillVersion === undefined || skillVersion === "") {
    errors.push(
      `${skillPath}: missing \`component_version:\` (must equal ${label} @componentVersion v${version}).`,
    )
  } else if (skillVersion !== version) {
    errors.push(
      `${label}: component v${version} ≠ ${skillName} component_version v${skillVersion} — must match 1:1.`,
    )
  }
  return skillPath
}

/**
 * @param {string} skillName - Paired skill name.
 * @param {string} skillPath - Source skill path.
 * @returns {void}
 */
const validateBundle = (skillName, skillPath) => {
  // The generated plugin bundle must be byte-for-byte identical to the source skill.
  const bundledPath = path.join(PLUGIN_SKILLS_DIR, skillName, "SKILL.md")
  if (!existsSync(bundledPath)) {
    errors.push(
      `${bundledPath} missing — run \`${SYNC_CMD}\` to bundle ${skillName}.`,
    )
  } else if (readStaged(bundledPath) !== readStaged(skillPath)) {
    errors.push(
      `${bundledPath}: out of sync with ${skillPath} (content differs) — run \`${SYNC_CMD}\`.`,
    )
  }
}

/**
 * @param {string} file - Component file path.
 * @param {string} source - Staged component source.
 * @param {string} version - Component version.
 * @returns {void}
 */
const validateChangelog = (file, source, version) => {
  const componentName =
    COMPONENT_TAG_RE.exec(source)?.groups?.componentName ?? pascalFromFile(file)
  const changelog = readStaged(CHANGELOG)
  const entryRe = new RegExp(
    `^###\\s+${componentName}\\s+v${version.replaceAll(".", "\\.")}\\s*$`,
    "imu",
  )
  if (changelog === "") {
    errors.push(
      `${CHANGELOG} not found — add a \`### ${componentName} v${version}\` entry.`,
    )
  } else if (!entryRe.test(changelog)) {
    errors.push(
      `${CHANGELOG}: missing \`### ${componentName} v${version}\` — document this version's change.`,
    )
  }
}

/**
 * @param {string} file - Component file path.
 * @param {string} source - Staged component source.
 * @param {string} label - Component path below the UI source directory.
 * @param {string} version - Component version.
 * @param {string} baseline - Merge-base revision.
 * @returns {void}
 */
const validateVersionBump = (file, source, label, version, baseline) => {
  if (baseline === "") {
    return
  }
  const baselineSource = git(["show", `${baseline}:${file}`])
  if (baselineSource === "") {
    return
  }
  const baselineVersion = VERSION_RE.exec(baselineSource)?.groups?.version
  if (baselineVersion === undefined || baselineVersion === "") {
    return
  }
  if (
    baselineVersion === version &&
    stripMeta(baselineSource) !== stripMeta(source)
  ) {
    errors.push(
      `${label}: code changed but @componentVersion is still v${version} — bump it (and its skill + changelog).`,
    )
  }
}

/**
 * @param {string} file - Component file path.
 * @param {string} baseline - Merge-base revision.
 * @returns {void}
 */
const validateComponent = (file, baseline) => {
  const source = readStaged(file)
  const metadata = componentMetadata(file, source)
  if (metadata === null) {
    return
  }
  const skillPath = validateSkill(metadata)
  if (skillPath === null) {
    return
  }
  validateBundle(metadata.skillName, skillPath)
  validateChangelog(file, source, metadata.version)
  validateVersionBump(file, source, metadata.label, metadata.version, baseline)
}

for (const file of toCheck) {
  validateComponent(file, base)
}

if (errors.length) {
  process.stderr.write("\n✖ skill-sync: component ↔ skill version mismatch\n\n")
  for (const e of errors) {
    process.stderr.write(`  • ${e}\n`)
  }
  process.stderr.write(
    "\nUpdate the component, its libs/ui/skills/<name>/SKILL.md, and the changelog story together, then re-stage.\n\n",
  )
  process.exit(1)
}

process.exit(0)
