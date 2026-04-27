#!/usr/bin/env node
import { createHash } from "node:crypto"
import { basename, resolve } from "node:path"

const PREFIX = "new-engine"
const HASH_LENGTH = 8
const MAX_NAME_LENGTH = 63
const VALID_NAME = /^[a-z0-9][a-z0-9_-]*$/

let rootDir = process.cwd()
let json = false

for (const arg of process.argv.slice(2)) {
  if (arg === "--json") {
    json = true
  } else if (arg === "-h" || arg === "--help") {
    process.stdout.write(
      "Usage: scripts/dev/project-name.mjs [--json] [root-dir]\n"
    )
    process.exit(0)
  } else {
    rootDir = arg
  }
}

function slug(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "worktree"
  )
}

function projectNameFor(sourceRootDir) {
  const absoluteRoot = resolve(sourceRootDir)
  const hash = createHash("sha256")
    .update(absoluteRoot)
    .digest("hex")
    .slice(0, HASH_LENGTH)
  const rootSlug = slug(basename(absoluteRoot))

  if (rootSlug === PREFIX) {
    return `${PREFIX}-${hash}`
  }

  const maxSlugLength = MAX_NAME_LENGTH - PREFIX.length - HASH_LENGTH - 2
  const shortSlug =
    rootSlug.length <= maxSlugLength
      ? rootSlug
      : rootSlug.slice(0, maxSlugLength).replace(/-+$/g, "") || "worktree"

  return `${PREFIX}-${shortSlug}-${hash}`
}

const explicitName =
  process.env.PROJECT_NAME || process.env.COMPOSE_PROJECT_NAME
const projectName = explicitName || projectNameFor(rootDir)
if (!VALID_NAME.test(projectName)) {
  throw new Error(
    `Invalid Docker Compose project name "${projectName}". Use lowercase letters, digits, hyphens, or underscores, and start with a letter or digit.`
  )
}

const output = json
  ? `${JSON.stringify(
      {
        project_name: projectName,
        source: explicitName ? "env" : "worktree",
        root_dir: resolve(rootDir),
      },
      null,
      2
    )}\n`
  : `${projectName}\n`

process.stdout.write(output)
