#!/usr/bin/env node
/**
 * Bundles the deep skills from libs/ui/skills/ into this plugin so the plugin
 * can be published standalone (outside the new-engine repo).
 *
 * libs/ui/skills/ stays the single source of truth — run this before every
 * plugin release:
 *
 *   node scripts/sync-skills.mjs           # write the bundle
 *   node scripts/sync-skills.mjs --check   # fail if the bundle is stale (CI / pre-commit)
 *
 * Copies every skill directory except `_artifacts`, refuses to overwrite the
 * plugin's own authored workflow skills on a name collision. Each SKILL.md is
 * converted to the portable Agent Skills frontmatter on the way
 * (see lib/skill-frontmatter.mjs); every other file is copied byte-for-byte.
 */
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { AUTHORED_SKILLS, toPortableSkill } from "./lib/skill-frontmatter.mjs"

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const srcDir = resolve(pluginDir, "../skills") // libs/ui/skills
const destDir = resolve(pluginDir, "skills")
const check = process.argv.includes("--check")

if (!existsSync(srcDir)) {
  console.error(`Source skills directory not found: ${srcDir}`)
  console.error(
    "Run this script from a checkout of the new-engine repo (plugin at libs/ui/agent-plugin)."
  )
  process.exit(1)
}

const listFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })

const expectedContent = (file) => {
  const raw = readFileSync(file)
  // Only a skill's top-level SKILL.md is rewritten; nested files ship verbatim.
  return relative(srcDir, file).split(/[\\/]/).length === 2 &&
    file.endsWith("SKILL.md")
    ? Buffer.from(toPortableSkill(raw.toString("utf8")))
    : raw
}

const entries = readdirSync(srcDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "_artifacts")
  .map((e) => e.name)

const stale = []
for (const name of entries) {
  if (AUTHORED_SKILLS.has(name)) {
    console.error(
      `COLLISION: repo skill "${name}" clashes with an authored plugin skill — rename one.`
    )
    process.exit(1)
  }
  const from = resolve(srcDir, name)
  const to = resolve(destDir, name)
  if (check) {
    const want = listFiles(from)
      .map((f) => relative(from, f))
      .sort()
    const have = existsSync(to)
      ? listFiles(to)
          .map((f) => relative(to, f))
          .sort()
      : []
    if (want.join("\n") !== have.join("\n")) {
      stale.push(name)
      continue
    }
    if (
      want.some(
        (f) => !expectedContent(join(from, f)).equals(readFileSync(join(to, f)))
      )
    ) {
      stale.push(name)
    }
    continue
  }
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, { recursive: true })
  writeFileSync(join(to, "SKILL.md"), expectedContent(join(from, "SKILL.md")))
}

// A skill deleted from the source must disappear from the bundle too.
for (const name of readdirSync(destDir)) {
  if (AUTHORED_SKILLS.has(name) || entries.includes(name)) {
    continue
  }
  if (check) {
    stale.push(`${name} (removed from source)`)
  } else {
    rmSync(resolve(destDir, name), { recursive: true, force: true })
  }
}

if (check) {
  if (stale.length) {
    console.error(
      `Bundled skills are stale: ${stale.join(", ")}\nRun: node libs/ui/agent-plugin/scripts/sync-skills.mjs`
    )
    process.exit(1)
  }
  console.log(`Bundle in sync (${entries.length} skills).`)
} else {
  console.log(`Bundled ${entries.length} skills from ${srcDir} into ${destDir}`)
}
