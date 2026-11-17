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
    assert.ok(selected.length > 0)
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
  assert.deepEqual(shards.flat(), ["only-story"])
  assert.equal(shards.filter(shard => shard.length).length, 1)
})


test("measured heavy stories are spread without dropping any identity", () => {
  const stories = ["heavy-a", "heavy-b", "small-a", "small-b", "small-c", "small-d"]
  const weights = { storyCount: 6, medianCost: 1, stories: { "heavy-a": 8, "heavy-b": 8 } }
  const shards = [1, 2].map(index => shardVisualStories(stories, { index, total: 2 }, weights))
  for (const shard of shards) {
    assert.equal(shard.filter(id => id.startsWith("heavy")).length, 1)
    assert.equal(shard.length, 3)
  }
  assert.deepEqual(shards.flat().sort(), [...stories].sort())
})

test("visual work leaves measured room for a cohosted accessibility scan", () => {
  const stories = ["a", "b", "c", "d", "e", "f"]
  const weights = { storyCount: 6, medianCost: 1, cohostedCosts: [2, 0], stories: {} }
  const shards = [1, 2].map(index => shardVisualStories(stories, { index, total: 2 }, weights))
  assert.equal(shards[0].length, 2)
  assert.equal(shards[1].length, 4)
  assert.deepEqual(shards.flat().sort(), stories)
})
