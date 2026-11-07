import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import {
  checkStateCheckpoints,
  isControlCenterHit,
  stateCheckpointStories,
  stateCheckpointSuffixes,
} from "../test/visual-state-molecule-panels-checkpoints.mjs"

test("panel coverage retains 21 stories and 46 appearances plus the scrolled detent", () => {
  assert.equal(stateCheckpointStories.length, 21)
  assert.equal(new Set(stateCheckpointStories).size, 21)
  assert.deepEqual(stateCheckpointStories, Object.keys(stateCheckpointSuffixes))
  assert.equal(Object.values(stateCheckpointSuffixes).flat().length, 47)
  assert.deepEqual(
    stateCheckpointSuffixes["molecules-drawer--snap-points-and-swipe"],
    [
      "--state-half-height-open",
      "--state-quarter-height-open",
      "--state-quarter-height-controls-open",
      "--state-full-height-open",
    ]
  )
  assert.deepEqual(
    stateCheckpointSuffixes["molecules-popover--positioning-behaviors"],
    [
      "--state-flip-open",
      "--state-bounded-slide-enabled-open",
      "--state-bounded-slide-disabled-open",
    ]
  )
  for (const suffixes of Object.values(stateCheckpointSuffixes)) {
    assert.equal(new Set(suffixes).size, suffixes.length)
    for (const suffix of suffixes) {
      assert.match(suffix, /^--state-[a-z0-9]+(?:-[a-z0-9]+)*-open$/)
    }
  }
})

test("control center hit-testing accepts descendants but rejects footer coverage", () => {
  const label = {}
  const footer = {}
  let hit = null
  const element = {
    getBoundingClientRect: () => ({
      left: 10.5,
      top: 100.25,
      width: 60,
      height: 40,
    }),
    contains: (node) => node === label,
    ownerDocument: {
      elementFromPoint: (x, y) => {
        assert.equal(x, 40.5)
        assert.equal(y, 120.25)
        return hit
      },
    },
  }
  for (const [target, expected] of [
    [element, true],
    [label, true],
    [footer, false],
    [null, false],
  ]) {
    hit = target
    assert.equal(isControlCenterHit(element), expected)
  }
})

test("each captured panel story is a checked-in Storybook export", () => {
  const requireUI = createRequire(new URL("../package.json", import.meta.url))
  const { toId, storyNameFromExport } = requireUI("storybook/internal/csf")
  const known = new Set()
  for (const component of ["dialog", "drawer", "popover"]) {
    const source = readFileSync(
      new URL(`../stories/molecules/${component}.stories.tsx`, import.meta.url),
      "utf8"
    )
    const title = source.match(
      /\bconst meta\b[\s\S]*?\btitle:\s*["']([^"']+)["']/
    )?.[1]
    assert.ok(title, component)
    for (const [, name] of source.matchAll(/^export const (\w+)\b/gm)) {
      known.add(toId(title, storyNameFromExport(name)))
    }
  }
  for (const id of stateCheckpointStories) {
    assert.ok(known.has(id), id)
  }
})

test("unassigned and prototype names do not interact with a page", async () => {
  const page = new Proxy(
    {},
    { get: () => assert.fail("Unexpected page access") }
  )
  const capture = () => assert.fail("Unexpected capture")
  for (const id of [
    "molecules-dialog--playground",
    "molecules-drawer--placements",
    "molecules-popover--async-content",
    "unknown-story",
    "__proto__",
    "constructor",
    "toString",
    "",
  ]) {
    assert.equal(await checkStateCheckpoints(page, id, capture), false, id)
  }
})
