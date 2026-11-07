import assert from "node:assert/strict"
import { test } from "node:test"
import { Script } from "node:vm"
import {
  assertWithinViewport,
  viewportOverhang,
} from "../test/visual-viewport.mjs"

const serializedOverhang = new Script(
  `(${viewportOverhang.toString()})(element)`
)
const roundingFailure = /1 CSS px rounding/

function rect(left, top, right, bottom) {
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function node(doc, options = {}) {
  const box = options.box ?? rect(0, 0, 1280, 720)
  return {
    ownerDocument: doc,
    parentElement: options.parent ?? doc.body ?? null,
    getBoundingClientRect: () => box,
    offsetWidth: options.offsetWidth ?? box.width,
    offsetHeight: options.offsetHeight ?? box.height,
    clientLeft: options.clientLeft ?? 0,
    clientTop: options.clientTop ?? 0,
    clientWidth: options.clientWidth ?? box.width,
    clientHeight: options.clientHeight ?? box.height,
    computedStyle: {
      position: "static",
      display: "block",
      overflowX: "visible",
      overflowY: "visible",
      transform: "none",
      translate: "none",
      rotate: "none",
      scale: "none",
      perspective: "none",
      filter: "none",
      backdropFilter: "none",
      contain: "none",
      willChange: "auto",
      contentVisibility: "visible",
      ...options.style,
    },
  }
}

function documentFixture() {
  const doc = {
    defaultView: {
      getComputedStyle(element) {
        // biome-ignore lint/suspicious/noMisplacedAssertion: Fixture validates ownerDocument during each test's serialized callback.
        assert.equal(element.ownerDocument, doc)
        return element.computedStyle
      },
    },
  }
  doc.documentElement = node(doc)
  doc.body = node(doc, { parent: doc.documentElement })
  return doc
}

function measure(element) {
  // No module bindings or ambient document: evaluate exactly the serialized callback.
  return serializedOverhang.runInNewContext({ element })
}

function locator(element) {
  return {
    evaluate(callback) {
      return Promise.resolve(
        new Script(`(${callback.toString()})(element)`).runInNewContext({
          element,
        })
      )
    },
  }
}

test("serialized geometry uses the element's owner document and view", () => {
  const doc = documentFixture()
  doc.documentElement.clientWidth = 320
  doc.documentElement.clientHeight = 240
  assert.equal(measure(node(doc, { box: rect(20, 20, 322, 100) })), 2)
})

test("measured Tour target passes but spotlight and 2px overhang fail", async () => {
  const doc = documentFixture()
  // Exact desktop 1280x720 ScrollTarget evidence after Zag's nearest scroll.
  const target = node(doc, { box: rect(34.08, 674.08, 261.95, 720.08) })
  const spotlight = node(doc, { box: rect(24.08, 664.08, 271.95, 730.08) })
  assert.ok(Math.abs(measure(target) - 0.08) < 0.000_001)
  assert.ok(Math.abs(measure(spotlight) - 10.08) < 0.000_001)
  await assertWithinViewport(locator(target))
  await assert.rejects(
    assertWithinViewport(locator(spotlight)),
    roundingFailure
  )
  await assert.rejects(
    assertWithinViewport(locator(node(doc, { box: rect(-2, 10, 100, 50) }))),
    roundingFailure
  )
})

test("the strict 1 CSS px budget applies independently to every viewport edge", () => {
  const doc = documentFixture()
  for (const box of [
    rect(-1, 10, 100, 50),
    rect(10, -1, 100, 50),
    rect(10, 10, 1281, 50),
    rect(10, 10, 100, 721),
  ]) {
    assert.equal(measure(node(doc, { box })), 1)
  }
  for (const box of [
    rect(-2, 10, 100, 50),
    rect(10, -2, 100, 50),
    rect(10, 10, 1282, 50),
    rect(10, 10, 100, 722),
  ]) {
    assert.equal(measure(node(doc, { box })), 2)
  }
})

test("hidden, auto, scroll and clip ancestors constrain required controls", () => {
  for (const overflow of ["hidden", "auto", "scroll", "clip"]) {
    const doc = documentFixture()
    const parent = node(doc, {
      box: rect(100, 100, 300, 300),
      clientLeft: 10,
      clientTop: 10,
      clientWidth: 180,
      clientHeight: 180,
      style: { overflowX: overflow, overflowY: overflow },
    })
    assert.equal(
      measure(node(doc, { parent, box: rect(120, 120, 292, 280) })),
      2,
      `${overflow} clips inside the border box`
    )
    assert.equal(
      measure(node(doc, { parent, box: rect(120, 108, 280, 280) })),
      2,
      `${overflow} clips the top border too`
    )
  }
})

test("scrollbar gutters and all nested scrollports remain real clips", () => {
  const doc = documentFixture()
  const outer = node(doc, {
    box: rect(100, 100, 300, 300),
    clientWidth: 184,
    clientHeight: 184,
    style: { overflowX: "auto", overflowY: "auto" },
  })
  const inner = node(doc, {
    parent: outer,
    box: rect(100, 100, 400, 400),
    style: { overflowX: "hidden", overflowY: "hidden" },
  })
  assert.equal(
    measure(node(doc, { parent: inner, box: rect(120, 120, 286, 280) })),
    2
  )
  assert.equal(
    measure(node(doc, { parent: inner, box: rect(120, 120, 280, 286) })),
    2
  )
})

test("visible overflow and an unclipped axis do not invent a clip", () => {
  const doc = documentFixture()
  const visible = node(doc, { box: rect(100, 100, 200, 200) })
  const target = node(doc, { parent: visible, box: rect(90, 90, 210, 210) })
  assert.ok(measure(target) <= 0)
  visible.computedStyle.overflowY = "clip"
  assert.ok(
    measure(node(doc, { parent: visible, box: rect(90, 120, 210, 180) })) <= 0
  )
})

test("scaled scrollports compare client geometry in viewport CSS pixels", () => {
  const doc = documentFixture()
  const parent = node(doc, {
    box: rect(100, 100, 500, 500),
    offsetWidth: 200,
    offsetHeight: 200,
    clientLeft: 10,
    clientTop: 10,
    clientWidth: 180,
    clientHeight: 180,
    style: { overflowX: "hidden", overflowY: "hidden", transform: "scale(2)" },
  })
  assert.equal(measure(node(doc, { parent, box: rect(130, 130, 482, 470) })), 2)
})

test("absolute controls escape intermediate static overflow, not their containing block", () => {
  const doc = documentFixture()
  const parent = node(doc, {
    box: rect(100, 100, 200, 200),
    style: { overflowX: "hidden", overflowY: "hidden" },
  })
  const target = node(doc, {
    parent,
    box: rect(90, 90, 210, 210),
    style: { position: "absolute" },
  })
  assert.ok(measure(target) <= 0)
  parent.computedStyle.position = "relative"
  assert.equal(measure(target), 10)
})

test("fixed controls escape positioned overflow until a fixed containing block", () => {
  const doc = documentFixture()
  const parent = node(doc, {
    box: rect(100, 100, 200, 200),
    style: { position: "relative", overflowX: "hidden", overflowY: "hidden" },
  })
  const target = node(doc, {
    parent,
    box: rect(90, 90, 210, 210),
    style: { position: "fixed" },
  })
  assert.ok(measure(target) <= 0)
  for (const style of [
    { transform: "matrix(1, 0, 0, 1, 0, 0)" },
    { translate: "0px" },
    { perspective: "1000px" },
    { contain: "paint" },
    { contain: "layout style" },
    { willChange: "opacity, transform" },
  ]) {
    const original = parent.computedStyle
    parent.computedStyle = { ...original, ...style }
    assert.equal(measure(target), 10, JSON.stringify(style))
    parent.computedStyle = original
  }
})

test("a normal descendant shares its absolute ancestor's overflow escape", () => {
  const doc = documentFixture()
  const clipped = node(doc, {
    box: rect(100, 100, 200, 200),
    style: { overflowX: "hidden", overflowY: "hidden" },
  })
  const positioned = node(doc, {
    parent: clipped,
    style: { position: "absolute" },
  })
  assert.ok(
    measure(node(doc, { parent: positioned, box: rect(90, 90, 210, 210) })) <= 0
  )
  clipped.computedStyle.position = "relative"
  assert.equal(
    measure(node(doc, { parent: positioned, box: rect(90, 90, 210, 210) })),
    10
  )
})

test("body clips count unless its overflow is propagated to the viewport", () => {
  const doc = documentFixture()
  doc.body = node(doc, {
    parent: doc.documentElement,
    box: rect(0, 0, 300, 200),
    style: { overflowY: "hidden" },
  })
  const target = node(doc, { box: rect(20, 180, 100, 202) })
  assert.ok(measure(target) <= 0)
  doc.documentElement.computedStyle.overflowY = "auto"
  assert.equal(measure(target), 2)
})
