import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseReleaseShard, visualStories } from "../test/visual-completion.mjs"
import { createVisualMatrix, shardVisualStories } from "../test/visual-projects.mjs"

const directory = "libs/ui/test/visual.spec.ts-snapshots/"

/** Git's tracked inventory is available even when a blob is outside the sparse checkout.
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function trackedBaselines(repoRoot) {
  return execFileSync("git", ["ls-files", "-z", "--", directory], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }).split("\0").filter(Boolean)
}

/**
 * Keep primary, interaction, portal, and tiled baselines for each assigned story
 * in every active screenshot project. Retired projects need no blob download.
 * @param {{files: string[], stories: {id: string}[], projects: {name: string}[], shard: {index: number, total: number}}} input
 */
export function baselinePathsForShard({ files, stories, projects, shard }) {
  const selected = shardVisualStories(
    [...stories].sort((a, b) => a.id.localeCompare(b.id, "en")),
    shard
  )
  return files.filter((file) => {
    const name = path.posix.basename(file)
    return projects.some((project) => name.endsWith(`-${project.name}-linux.png`)) &&
      selected.some((story) => name.startsWith(`${story.id}-`))
  })
}

function main() {
  const repoRoot = path.resolve(import.meta.dirname, "../../..")
  const shard = parseReleaseShard(process.env.SHARD, "SHARD")
  if (!shard) throw new Error("SHARD is required")
  const index = JSON.parse(fs.readFileSync(
    path.join(repoRoot, "libs/ui/storybook-static/index.json"), "utf8"
  ))
  const files = baselinePathsForShard({
    files: trackedBaselines(repoRoot),
    stories: visualStories(index.entries),
    projects: createVisualMatrix(),
    shard,
  })
  if (!files.length) throw new Error("No tracked baselines for this component shard")
  execFileSync("git", ["sparse-checkout", "add", "--stdin"], {
    cwd: repoRoot,
    input: files.map((file) => `/${file}`).join("\n") + "\n",
    stdio: ["pipe", "inherit", "inherit"],
  })
  console.log(`Checked out ${files.length} baselines for shard ${shard.index}/${shard.total}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main()
}
