#!/usr/bin/env node
/**
 * Bundles the deep skills from libs/ui/skills/ into this plugin so the plugin
 * can be published standalone (outside the new-engine repo).
 *
 * libs/ui/skills/ stays the single source of truth — run this before every
 * plugin release:
 *
 *   node scripts/sync-skills.mjs
 *
 * Copies every skill directory except `_artifacts`, refuses to overwrite the
 * plugin's own authored workflow skills on a name collision.
 */
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs"
import path from "node:path"

const pluginDir = path.resolve(import.meta.dirname, "..")
// libs/ui/skills
const srcDir = path.resolve(pluginDir, "../skills")
const destDir = path.resolve(pluginDir, "skills")

const AUTHORED = new Set([
  "ui-new-component",
  "ui-tokens",
  "ui-story",
  "ui-validate",
  "ui-theme-brand",
  "ui-figma-sync",
  "ui-release-check",
  "ui-component-usage",
])

if (!existsSync(srcDir)) {
  console.error(`Source skills directory not found: ${srcDir}`)
  console.error(
    "Run this script from a checkout of the new-engine repo (plugin at libs/ui/agent-plugin).",
  )
  process.exit(1)
}

const MAX_SKILL_DIRECTORIES = 1000
const MAX_SYNC_ENTRIES = 10_000
const sourceEntries = readdirSync(srcDir, { withFileTypes: true })
if (sourceEntries.length > MAX_SKILL_DIRECTORIES) {
  throw new Error(
    `Refusing to sync ${sourceEntries.length} entries; limit is ${MAX_SKILL_DIRECTORIES}.`,
  )
}
const entries = sourceEntries
  .filter((entry) => entry.isDirectory() && entry.name !== "_artifacts")
  .map((entry) => entry.name)

let copied = 0
let copiedEntries = 0
const withinCopyLimit = () => {
  copiedEntries += 1
  if (copiedEntries > MAX_SYNC_ENTRIES) {
    throw new Error(
      `Refusing to copy more than ${MAX_SYNC_ENTRIES} skill entries.`,
    )
  }
  return true
}
for (const name of entries) {
  if (AUTHORED.has(name)) {
    console.error(
      `COLLISION: repo skill "${name}" clashes with an authored plugin skill — rename one.`,
    )
    process.exit(1)
  }
  const dest = path.resolve(destDir, name)
  rmSync(dest, { force: true, recursive: true })
  cpSync(path.resolve(srcDir, name), dest, {
    filter: withinCopyLimit,
    recursive: true,
  })
  copied += 1
}

console.log(`Bundled ${copied} skills from ${srcDir} into ${destDir}`)
