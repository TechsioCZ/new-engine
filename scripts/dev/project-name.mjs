#!/usr/bin/env node
import { createHash } from "node:crypto"
import { basename, resolve } from "node:path"

function sanitizeSlug(value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "worktree"
}

function truncateSlug(value, maxLength) {
  if (value.length <= maxLength) {
    return value
  }

  return value.slice(0, maxLength).replace(/-+$/g, "") || "worktree"
}

function projectNameFor(rootDir) {
  const absoluteRoot = resolve(rootDir)
  const hash = createHash("sha256")
    .update(absoluteRoot)
    .digest("hex")
    .slice(0, 8)
  const rootSlug = sanitizeSlug(basename(absoluteRoot))
  const prefix = "new-engine"
  const name =
    rootSlug === prefix
      ? `${prefix}-${hash}`
      : `${prefix}-${truncateSlug(rootSlug, 63 - prefix.length - hash.length - 2)}-${hash}`

  return name.replace(/[^a-z0-9_-]/g, "-")
}

function parseArgs(argv) {
  const args = {
    rootDir: process.cwd(),
    json: false,
  }

  for (const arg of argv) {
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "-h" || arg === "--help") {
      process.stdout.write(
        "Usage: scripts/dev/project-name.mjs [--json] [root-dir]\n"
      )
      process.exit(0)
    }
    args.rootDir = arg
  }

  return args
}

const args = parseArgs(process.argv.slice(2))
const explicitName =
  process.env.PROJECT_NAME || process.env.COMPOSE_PROJECT_NAME
const projectName = explicitName || projectNameFor(args.rootDir)
if (!/^[a-z0-9][a-z0-9_-]*$/.test(projectName)) {
  throw new Error(
    `Invalid Docker Compose project name "${projectName}". Use lowercase letters, digits, hyphens, or underscores, and start with a letter or digit.`
  )
}

if (args.json) {
  process.stdout.write(
    `${JSON.stringify(
      {
        project_name: projectName,
        source: explicitName ? "env" : "worktree",
        root_dir: resolve(args.rootDir),
      },
      null,
      2
    )}\n`
  )
} else {
  process.stdout.write(`${projectName}\n`)
}
