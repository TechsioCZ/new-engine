import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { after, test } from "node:test"
import { runInNewContext } from "node:vm"

const require = createRequire(import.meta.url)
const menu = require("@zag-js/menu")
const requireMenu = createRequire(require.resolve("@zag-js/menu"))
const requirePopper = createRequire(requireMenu.resolve("@zag-js/popper"))
const popper = requireMenu("@zag-js/popper")
const floating = requirePopper("@floating-ui/dom")
const ts = require("typescript")
const source = readFileSync(
  new URL("../src/molecules/menu.tsx", import.meta.url),
  "utf8"
)
const start = source.indexOf("const submenuOverflowPadding =")
const end = source.indexOf("type SubmenuItemProps =", start)
if (start < 0 || end <= start) {
  throw new Error("Submenu positioning helpers are missing")
}
const { getSubmenuPositioning, createSubmenuMachine } = runInNewContext(
  ts.transpileModule(
    `${source.slice(start, end)}; ({ getSubmenuPositioning, createSubmenuMachine })`,
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }
  ).outputText,
  { menu, queueMicrotask }
)

// Run the installed Zag effect and Popper middleware, replacing only DOM
// measurement, frame scheduling and observation. This is not a browser test.
const originalCompute = floating.computePosition
const originalAutoUpdate = floating.autoUpdate
const originalWindow = globalThis.window
const originalRaf = globalThis.requestAnimationFrame
const originalCancelRaf = globalThis.cancelAnimationFrame
const frames = new Map()
const observers = new Set()
let frameId = 0
let geometry
let computations = []
globalThis.window = { devicePixelRatio: 1 }
globalThis.requestAnimationFrame = (callback) => {
  frameId += 1
  const id = frameId
  frames.set(id, callback)
  return id
}
globalThis.cancelAnimationFrame = (id) => frames.delete(id)
floating.autoUpdate = (_anchor, _element, update) => {
  observers.add(update)
  update()
  return () => observers.delete(update)
}
floating.computePosition = async (anchor, element, options) => {
  const result = await originalCompute(anchor, element, {
    ...options,
    platform: {
      getElementRects: () => ({
        reference: anchor.getBoundingClientRect(),
        floating: { x: 0, y: 0, ...geometry.child },
      }),
      getClippingRect: () => ({ x: 0, y: 0, ...geometry.viewport }),
      getDimensions: () => geometry.child,
      getOffsetParent: () => null,
      convertOffsetParentRelativeRectToViewportRelativeRect: ({
        rect: measured,
      }) => measured,
      isElement: () => false,
      getDocumentElement: () => ({}),
      isRTL: () => geometry.rtl,
    },
  })
  computations.push(result)
  return result
}
after(() => {
  floating.computePosition = originalCompute
  floating.autoUpdate = originalAutoUpdate
  globalThis.window = originalWindow
  globalThis.requestAnimationFrame = originalRaf
  globalThis.cancelAnimationFrame = originalCancelRaf
})

function rect(x, y, width, height) {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
  }
}

function fixture({
  parent = rect(64, 8, 192, 552),
  rtl = false,
  childHeight = 120,
} = {}) {
  geometry = {
    viewport: { width: 320, height: 568 },
    child: { width: 192, height: childHeight },
    rtl,
  }
  computations = []
  const values = new Map()
  const document = {
    documentElement: { clientWidth: 320, clientHeight: 568 },
    defaultView: globalThis.window,
    createElement: () => ({ clientWidth: 0, clientHeight: 0 }),
  }
  document.defaultView.getComputedStyle = () => ({
    paddingTop: "8px",
    paddingBottom: "8px",
    borderTopWidth: "1px",
    borderBottomWidth: "1px",
  })
  const panel = { ownerDocument: document, getBoundingClientRect: () => parent }
  const row = {
    closest: () => panel,
    getBoundingClientRect: () =>
      rect(parent.left + 8, 260, parent.width - 16, 40),
  }
  const positioner = {
    offsetWidth: 192,
    ownerDocument: document,
    firstElementChild: null,
    querySelector: () => null,
    style: { setProperty: (key, value) => values.set(key, value) },
  }
  // No first child avoids z-index DOM work; provide its row/chrome only to the
  // production geometry helper, using the same dimensions as this positioner.
  const measuredPositioner = {
    ...positioner,
    firstElementChild: {
      querySelector: () => ({
        getBoundingClientRect: () => rect(0, 0, 176, 40),
      }),
    },
  }
  const resolve = () => getSubmenuPositioning(row, measuredPositioner)
  const positioning = {
    fitViewport: true,
    overflowPadding: 8,
    placement: rtl ? "left-start" : "right-start",
    gutter: 0,
    flip: [rtl ? "right-start" : "left-start", "bottom-start", "top-start"],
  }
  const params = {
    prop: (key) => (key === "positioning" ? positioning : undefined),
    context: { get: () => null, set: () => undefined },
    refs: { get: () => undefined },
    scope: {
      id: "geometry",
      getById: (id) => {
        if (id.endsWith(":popper")) {
          return positioner
        }
        if (id.endsWith(":trigger")) {
          return row
        }
        return null
      },
      getRootNode: () => ({ querySelectorAll: () => [] }),
    },
  }
  return {
    panel,
    row,
    positioner,
    values,
    resolve,
    params,
    setParent: (next) => {
      parent = next
    },
  }
}

async function settle() {
  for (let i = 0; i < 8; i++) {
    const pending = [...frames.values()]
    frames.clear()
    for (const callback of pending) {
      callback()
    }
    await new Promise((resolve) => setImmediate(resolve))
  }
}

function isContained(f) {
  const result = computations.at(-1)
  if (!result) {
    return false
  }
  const available = Number.parseFloat(f.values.get("--available-height"))
  return (
    result.x >= 8 &&
    result.x + geometry.child.width <= 312 &&
    result.y >= 8 &&
    available >= 58 &&
    result.y + Math.min(geometry.child.height, available) <= 560
  )
}

test("installed non-overlap middleware collapses a viewport-tall whole-panel anchor", async () => {
  const f = fixture()
  const cleanup = popper.getPlacement(f.panel, f.positioner, {
    ...f.params.prop("positioning"),
    overlap: false,
    listeners: false,
  })
  try {
    await settle()
    assert.equal(computations.at(-1).placement, "bottom-start")
    assert.equal(f.values.get("--available-height"), "0px")
  } finally {
    cleanup()
  }
})

for (const rtl of [false, true]) {
  for (const childHeight of [120, 800]) {
    test(`tall parent keeps ${childHeight}px child scroll space and containment (${rtl ? "rtl" : "ltr"})`, async () => {
      const f = fixture({ rtl, childHeight })
      assert.equal(f.resolve().anchor, f.row)
      assert.equal(f.resolve().overlap, true)
      const cleanup = createSubmenuMachine(
        f.resolve
      ).implementations.effects.trackPositioning(f.params)
      try {
        await settle()
        assert.equal(f.values.get("--available-height"), "552px")
        assert.ok(isContained(f))
      } finally {
        cleanup()
      }
      assert.equal(observers.size, 0)
      assert.equal(frames.size, 0)
    })
  }
}

test("short parents retain whole-panel non-overlap and ordinary side flyouts retain row anchoring", () => {
  const short = fixture({ parent: rect(64, 180, 192, 160) })
  assert.equal(short.resolve().anchor, short.panel)
  assert.equal(short.resolve().overlap, false)
  const wide = fixture({ parent: rect(8, 180, 100, 160) })
  assert.equal(wide.resolve().anchor, wide.row)
  assert.equal(wide.resolve().overlap, false)
})

test("short parents keep child commands outside the full parent panel", async () => {
  const f = fixture({ parent: rect(64, 180, 192, 160) })
  const cleanup = createSubmenuMachine(
    f.resolve
  ).implementations.effects.trackPositioning(f.params)
  try {
    await settle()
    assert.ok(isContained(f))
    assert.ok(computations.at(-1).y >= f.panel.getBoundingClientRect().bottom)
  } finally {
    cleanup()
  }
})

test("one-shot native repositioning uses the same constrained fallback", async () => {
  const f = fixture()
  createSubmenuMachine(f.resolve).implementations.actions.reposition({
    ...f.params,
    event: {},
  })
  await settle()
  assert.equal(f.values.get("--available-height"), "552px")
  assert.ok(isContained(f))
  assert.equal(observers.size, 0)
})

test("a shelf shorter than one command plus chrome uses the constrained fallback", () => {
  const f = fixture({ parent: rect(64, 40, 192, 488) })
  assert.equal(f.resolve().anchor, f.row)
  assert.equal(f.resolve().overlap, true)
})

test("native updates rebuild captured overlap only when the geometry changes mode", async () => {
  const f = fixture({ parent: rect(64, 180, 192, 160) })
  const cleanup = createSubmenuMachine(
    f.resolve
  ).implementations.effects.trackPositioning(f.params)
  try {
    await settle()
    assert.equal(observers.size, 1)
    assert.ok(isContained(f))
    const original = [...observers][0]
    original()
    await settle()
    assert.equal([...observers][0], original)
    f.setParent(rect(64, 8, 192, 552))
    original()
    await settle()
    assert.notEqual([...observers][0], original)
    assert.equal(observers.size, 1)
    assert.equal(f.values.get("--available-height"), "552px")
    assert.ok(isContained(f))
    f.setParent(rect(64, 180, 192, 160))
    for (const update of observers) {
      update()
    }
    await settle()
    assert.equal(observers.size, 1)
    assert.equal(f.resolve().overlap, false)
    assert.ok(isContained(f))
  } finally {
    cleanup()
  }
  assert.equal(observers.size, 0)
})

test("closing cancels a queued geometry-mode restart", async () => {
  const f = fixture({ parent: rect(64, 180, 192, 160) })
  const cleanup = createSubmenuMachine(
    f.resolve
  ).implementations.effects.trackPositioning(f.params)
  await settle()
  f.setParent(rect(64, 8, 192, 552))
  for (const update of observers) {
    update()
  }
  cleanup()
  await settle()
  assert.equal(observers.size, 0)
  assert.equal(frames.size, 0)
})
