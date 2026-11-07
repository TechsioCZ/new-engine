// biome-ignore-all lint/suspicious/noMisplacedAssertion: The harness executes the story's assertions from node:test cases.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import ts from "typescript"

const source = ts.createSourceFile(
  "popover.stories.tsx",
  readFileSync(
    new URL("../stories/molecules/popover.stories.tsx", import.meta.url),
    "utf8"
  ),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
)
const story = source.statements
  .flatMap((statement) =>
    ts.isVariableStatement(statement)
      ? [...statement.declarationList.declarations]
      : []
  )
  .find((declaration) => declaration.name.getText(source) === "LongContent")
const playSource = story?.initializer?.properties
  .find((property) => property.name?.getText(source) === "play")
  ?.initializer?.getText(source)
assert.ok(playSource, "LongContent must expose its play callback")
const executable = ts.transpileModule(`(${playSource})`, {
  compilerOptions: { target: ts.ScriptTarget.ESNext },
}).outputText

// This is a scheduling regression, not a browser-layout substitute. Zag mounts
// offscreen, defers positioning to rAF and asynchronously writes size constraints.
// Model that supported order while executing the actual exported play callback.
function createHarness({ clippedBy = 0, neverPositioned = false } = {}) {
  let frame = 0
  let scrollTop = 0
  let mounted = true
  const writes = []
  const settled = () => frame >= 3
  const positioned = () => frame > 0 && !neverPositioned
  const rect = (x, y, width, height) => ({
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
  })
  const viewport = {
    get clientHeight() {
      return settled() ? 460 : 560
    },
    get clientWidth() {
      return settled() ? 300 : 410
    },
    get scrollHeight() {
      return settled() ? 1500 : 1000
    },
    get scrollWidth() {
      return this.clientWidth
    },
    get scrollTop() {
      return scrollTop
    },
    set scrollTop(value) {
      writes.push({ positioned: positioned(), settled: settled(), value })
      scrollTop = Math.max(
        0,
        Math.min(value, this.scrollHeight - this.clientHeight)
      )
    },
    getBoundingClientRect() {
      return rect(
        120,
        positioned() ? 120 : -700,
        this.clientWidth,
        this.clientHeight
      )
    },
  }
  const close = {
    getBoundingClientRect: () => rect(560, positioned() ? 120 : -700, 32, 32),
  }
  const positioner = {
    style: { getPropertyValue: () => (positioned() ? "100px" : "") },
  }
  const panel = {
    closest: () => positioner,
    querySelector: () => viewport,
    getBoundingClientRect: () =>
      rect(100, positioned() ? 100 : -720, 512, settled() ? 500 : 600),
  }
  const last = {
    getBoundingClientRect() {
      const bounds = viewport.getBoundingClientRect()
      const bottom =
        bounds.bottom +
        viewport.scrollHeight -
        viewport.clientHeight -
        scrollTop -
        8 +
        clippedBy
      return rect(bounds.left, bottom - 40, 280, 40)
    },
  }
  const queries = {
    getByRole: () => close,
    findByRole: async () => panel,
    getByText: (text) => (text.startsWith("Attachment 15:") ? last : {}),
  }
  const view = {
    getComputedStyle: () => ({ outlineWidth: "2", outlineOffset: "2" }),
    requestAnimationFrame(callback) {
      queueMicrotask(() => {
        frame += 1
        callback(frame)
      })
    },
  }
  const canvasElement = {
    ownerDocument: {
      body: {},
      documentElement: { clientHeight: 720 },
      defaultView: view,
    },
  }
  const play = runInNewContext(executable, {
    within: () => queries,
    userEvent: {
      click: (element) => {
        if (element === close && writes.length) {
          mounted = false
        }
      },
    },
    requestAnimationFrame: view.requestAnimationFrame,
    expect: (actual) => ({
      toBe: (expected) => assert.equal(actual, expected),
      toEqual: (expected) =>
        assert.equal(JSON.stringify(actual), JSON.stringify(expected)),
      toBeGreaterThan: (expected) =>
        assert.ok(actual > expected, `${actual} must exceed ${expected}`),
      toBeGreaterThanOrEqual: (expected) =>
        assert.ok(actual >= expected, `${actual} must be at least ${expected}`),
      toBeLessThanOrEqual: (expected) =>
        assert.ok(actual <= expected, `${actual} must be at most ${expected}`),
      toBeVisible: () => assert.ok(actual && mounted),
      not: {
        toBeNull: () => assert.notEqual(actual, null),
        toBe: (expected) => assert.notEqual(actual, expected),
        toBeInTheDocument: () => assert.equal(mounted, false),
      },
    }),
    async waitFor(check, options) {
      assert.equal(options, undefined, "Use the existing default deadline")
      let failure
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          await check()
          return
        } catch (error) {
          failure = error
          frame += 1
        }
      }
      throw failure
    },
  })
  return { play: () => play({ canvasElement }), writes }
}

test("LongContent waits for deferred placement and scroller sizing before its two scrolls", async () => {
  const { play, writes } = createHarness()
  await play()
  assert.equal(writes.length, 2, "Readiness must not retry or force scrolling")
  assert.ok(
    writes.every(({ positioned, settled }) => positioned && settled),
    "Both scrolls must follow committed positioning and settled scroller geometry"
  )
  assert.deepEqual(
    writes.map(({ value }) => value),
    [750, 1500]
  )
})

const clippingFailure = /must be at most/

test("LongContent still rejects final attachment clipping instead of rescrolling", async () => {
  const { play, writes } = createHarness({ clippedBy: 10 })
  await assert.rejects(play, clippingFailure)
  assert.equal(writes.length, 2)
})

test("LongContent does not scroll when positioning never commits", async () => {
  const { play, writes } = createHarness({ neverPositioned: true })
  await assert.rejects(play)
  assert.equal(writes.length, 0)
})
