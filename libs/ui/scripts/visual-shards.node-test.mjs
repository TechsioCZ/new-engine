import assert from "node:assert/strict"
import test from "node:test"
import costs from "../test/visual-shard-costs.json" with { type: "json" }
import {
  createVisualMatrix,
  shardVisualStories,
} from "../test/visual-projects.mjs"

test("every screenshot shard runs every browser, without duplicate or omitted identities", () => {
  const stories = Array.from({ length: 23 }, (_, index) => `story-${index}`)
  const projects = createVisualMatrix().map(({ name }) => name)
  const expected = projects
    .flatMap((project) => stories.map((story) => `${project}/${story}`))
    .sort()
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
    shardVisualStories(["only-story"], { index: index + 1, total: 5 }),
  )
  assert.deepEqual(shards.flat(), ["only-story"])
  assert.equal(shards.filter((shard) => shard.length).length, 1)
})

test("measured heavy stories are spread without dropping any identity", () => {
  const stories = [
    "heavy-a",
    "heavy-b",
    "small-a",
    "small-b",
    "small-c",
    "small-d",
  ]
  const weights = {
    storyCount: 6,
    medianCost: 1,
    files: {
      "heavy-a": { cost: 8, storyCount: 1 },
      "heavy-b": { cost: 8, storyCount: 1 },
    },
  }
  const shards = [1, 2].map((index) =>
    shardVisualStories(stories, { index, total: 2 }, weights),
  )
  for (const shard of shards) {
    assert.equal(shard.filter((id) => id.startsWith("heavy")).length, 1)
    assert.equal(shard.length, 3)
  }
  assert.deepEqual(shards.flat().sort(), [...stories].sort())
})

test("visual work leaves measured room for a cohosted accessibility scan", () => {
  const stories = ["a", "b", "c", "d", "e", "f"]
  const weights = {
    storyCount: 6,
    medianCost: 1,
    cohostedCosts: [2, 0],
    files: {},
  }
  const shards = [1, 2].map((index) =>
    shardVisualStories(stories, { index, total: 2 }, weights),
  )
  assert.equal(shards[0].length, 2)
  assert.equal(shards[1].length, 4)
  assert.deepEqual(shards.flat().sort(), stories)
})

test("measured story files stay together, cover all stories, and fit the screenshot budget", () => {
  const stories = Object.entries(costs.files).flatMap(
    ([importPath, { storyCount }]) =>
      Array.from({ length: storyCount }, (_, index) => ({
        id: `${importPath}/${index}`,
        importPath,
      })),
  )
  assert.equal(stories.length, costs.storyCount)
  const owners = new Map()
  const all = []
  for (let index = 1; index <= 6; index++) {
    const selected = shardVisualStories(stories, { index, total: 6 })
    let cost = 0
    for (const story of selected) {
      assert.ok(
        !owners.has(story.importPath) || owners.get(story.importPath) === index,
      )
      owners.set(story.importPath, index)
      cost +=
        costs.files[story.importPath].cost /
        costs.files[story.importPath].storyCount
    }
    assert.ok(selected.length > 0)
    assert.ok(
      cost <= 330000 * 4,
      `Bundle ${index}: ${cost / 4000}s of screenshots`,
    )
    all.push(...selected)
  }
  assert.equal(new Set(all.map((story) => story.id)).size, stories.length)
  assert.equal(all.length, stories.length)
})

test("new and partially changed story files are never lost or duplicated", () => {
  const stories = [
    { id: "known-one", importPath: "known" },
    { id: "new-one", importPath: "new" },
  ]
  const weights = {
    storyCount: 10,
    medianCost: 5,
    maxVisualCost: 1,
    files: { known: { cost: 100, storyCount: 10 } },
  }
  const selected = [1, 2].flatMap((index) =>
    shardVisualStories(stories, { index, total: 2 }, weights),
  )
  assert.deepEqual(selected.map((story) => story.id).sort(), [
    "known-one",
    "new-one",
  ])
})
