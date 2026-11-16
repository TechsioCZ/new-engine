import assert from "node:assert/strict"
import test from "node:test"
import { createVisualMatrix, shardVisualStories } from "../test/visual-projects.mjs"

test("every screenshot shard runs every browser, without duplicate or omitted identities", () => {
  const stories = Array.from({ length: 23 }, (_, index) => `story-${index}`)
  const projects = createVisualMatrix().map(({ name }) => name)
  const expected = projects.flatMap((project) =>
    stories.map((story) => `${project}/${story}`)
  ).sort()
  const actual = []
  for (let index = 1; index <= 5; index++) {
    const selected = shardVisualStories(stories, { index, total: 5 })
    assert.ok(selected.length >= 4 && selected.length <= 5)
    for (const project of projects) {
      actual.push(...selected.map((story) => `${project}/${story}`))
    }
  }
  assert.deepEqual(actual.sort(), expected)
  assert.equal(new Set(actual).size, actual.length)
  assert.deepEqual(shardVisualStories(stories, undefined), stories)
})

test("a changed subset smaller than the matrix leaves only explicitly empty shards", () => {
  const shards = Array.from({ length: 5 }, (_, index) =>
    shardVisualStories(["only-story"], { index: index + 1, total: 5 })
  )
  assert.deepEqual(shards, [["only-story"], [], [], [], []])
})
