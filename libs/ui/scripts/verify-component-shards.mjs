// Asserts that the sharded CI release run covered every screenshot identity
// exactly once and that every shard ran clean.
//   node scripts/verify-component-shards.mjs <directory with one folder per shard>
import fs from "node:fs"
import path from "node:path"
import { assertVisualCompletion } from "../test/visual-completion.mjs"
import { createVisualMatrix } from "../test/visual-projects.mjs"

const root = process.argv[2]
if (!root) {
  throw new Error(
    "Usage: verify-component-shards.mjs <shard artifact directory>"
  )
}
/** @param {string} directory @param {string} name @returns {string[]} */
function find(directory, name) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return find(full, name)
    }
    return entry.name === name ? [full] : []
  })
}
const reportFiles = find(root, "all.json")
const indexFiles = find(root, "index.json")
const expectedShards = Number(process.env.PLAYWRIGHT_RELEASE_SHARDS ?? 0)
if (expectedShards && reportFiles.length !== expectedShards) {
  throw new Error(
    `Expected ${expectedShards} shard reports, found ${reportFiles.length}`
  )
}
if (!(reportFiles.length && indexFiles.length)) {
  throw new Error(`No shard reports or Storybook index found under ${root}`)
}
const indexes = indexFiles.map((file) => fs.readFileSync(file, "utf8"))
if (new Set(indexes).size !== 1) {
  throw new Error("Shards were built from different Storybook indexes")
}
const stories = Object.values(JSON.parse(indexes[0]).entries).filter(
  (entry) => entry.type === "story"
)
assertVisualCompletion(
  reportFiles.map((file) => JSON.parse(fs.readFileSync(file, "utf8"))),
  stories,
  createVisualMatrix().map((project) => project.name)
)
console.log(
  `Verified ${reportFiles.length} shards: ${stories.length} stories × ${createVisualMatrix().length} visual projects`
)
