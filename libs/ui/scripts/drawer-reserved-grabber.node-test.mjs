import assert from "node:assert/strict"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import { visibleFloatingSurfaces } from "../test/visual-popup-capture.mjs"
import { viewportOverhang } from "../test/visual-viewport.mjs"

const rect = (x, y, width, height) => ({
  x,
  y,
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
  width,
  height,
})

// v7 retained traces: the first (50%) checkpoint, not the short 25% detent.
// The trace stores the inner viewport geometry. The captured CSS supplies the
// 1px panel border and 20px reserved strip (8px + 4px + 8px).
function reservedGrabber(width, height) {
  const panelTop = height / 2
  const document = {}
  const style = {
    display: "block",
    visibility: "visible",
    position: "static",
    overflowX: "visible",
    overflowY: "visible",
    contain: "none",
    willChange: "auto",
    contentVisibility: "visible",
    getPropertyValue: () => "0px",
  }
  function node(bounds, parentElement, attributes = {}, overrides = {}) {
    return {
      parentElement,
      ownerDocument: document,
      bounds,
      style: { ...style, ...overrides },
      clientLeft: 0,
      clientTop: 0,
      clientWidth: bounds.width,
      clientHeight: bounds.height,
      offsetWidth: bounds.width,
      offsetHeight: bounds.height,
      getBoundingClientRect() {
        return this.bounds
      },
      getClientRects() {
        return [this.bounds]
      },
      getAttribute: (name) => attributes[name] ?? null,
      matches: (selector) =>
        selector.includes(`[data-part="${attributes["data-part"]}"]`) ||
        (attributes.class === "drawer-visible-footer" &&
          selector.includes(".drawer-visible-footer")),
      closest: () => null,
    }
  }
  document.documentElement = node(rect(0, 0, width, height), null)
  document.body = node(rect(0, 0, width, height), document.documentElement)
  document.defaultView = { getComputedStyle: (element) => element.style }
  const positioner = node(rect(0, 0, width, height), document.body, {
    "data-scope": "drawer",
    "data-part": "positioner",
  })
  const panel = node(
    rect(0, panelTop, width, height),
    positioner,
    { "data-scope": "drawer", "data-part": "content", role: "dialog" },
    {
      position: "relative",
      transform: `matrix(1, 0, 0, 1, 0, ${panelTop})`,
      getPropertyValue: (name) =>
        name === "--drawer-snap-point-offset-y" ? `${panelTop}px` : "0px",
    }
  )
  const viewport = node(
    rect(1, panelTop + 21, width - 2, panelTop - 21),
    panel,
    {},
    { overflowX: "auto", overflowY: "auto" }
  )
  viewport.scrollTop = 0
  viewport.scrollHeight = viewport.clientHeight
  const grabber = node(
    rect(1, panelTop + 1, width - 2, 20),
    viewport,
    { "data-scope": "drawer", "data-part": "grabber" },
    { position: "absolute" }
  )
  const title = node(rect(17, panelTop + 21, width - 34, 24), viewport, {
    "data-scope": "drawer",
    "data-part": "title",
  })
  const footer = node(rect(1, height - 65, width - 2, 65), viewport, {
    class: "drawer-visible-footer",
  })
  const close = node(rect(width - 82, height - 54, 72, 44), footer, {
    "data-scope": "drawer",
    "data-part": "close-trigger",
  })
  panel.closest = (selector) =>
    selector.includes("positioner") ? positioner : null
  panel.querySelector = () => viewport
  panel.querySelectorAll = () => [grabber, title, footer, close]
  document.getElementById = () => ({ contains: () => false })
  document.querySelectorAll = () => [panel]
  const page = {
    evaluate: async (evaluate) =>
      runInNewContext(`(${evaluate.toString()})()`, {
        document,
        getComputedStyle: document.defaultView.getComputedStyle,
        scrollX: 0,
        scrollY: 0,
      }),
  }
  return { page, panel, viewport, grabber, title, footer, close, node }
}

for (const [project, width, height] of [
  ["desktop", 1265, 720],
  ["mobile", 393, 659],
]) {
  test(`${project}: reserved grabber escapes the unpositioned scrollport, not the visible panel`, () => {
    const { grabber, title, footer, close, viewport } = reservedGrabber(
      width,
      height
    )
    assert.equal(viewport.bounds.y, project === "desktop" ? 381 : 350.5)
    assert.equal(viewport.bounds.height, project === "desktop" ? 339 : 308.5)
    assert.equal(viewport.bounds.top - grabber.bounds.top, 20)
    for (const essential of [grabber, title, footer, close]) {
      assert.ok(viewportOverhang(essential) <= 1)
    }
  })

  test(`${project}: capture must accept the intact reserved grabber strip`, async () => {
    const { page } = reservedGrabber(width, height)
    const [surface] = await visibleFloatingSurfaces(page)
    assert.equal(surface.clipped, false)
    assert.deepEqual(Array.from(surface.clippedDescendants), [])
  })

  test(`${project}: moving only the fixture grabber inside the scrollport removes the failure`, async () => {
    const { page, grabber, viewport } = reservedGrabber(width, height)
    // Counterfactual only: never move the real grabber into the scrolling body.
    grabber.bounds = rect(1, viewport.bounds.top, width - 2, 20)
    const [surface] = await visibleFloatingSurfaces(page)
    assert.deepEqual(Array.from(surface.clippedDescendants), [])
  })

  test(`${project}: a positioned scrollport must still reject the same grabber geometry`, async () => {
    const { page, viewport, grabber } = reservedGrabber(width, height)
    viewport.style.position = "relative"
    assert.ok(viewportOverhang(grabber) > 1)
    const [surface] = await visibleFloatingSurfaces(page)
    assert.ok(surface.clipped || surface.clippedDescendants.length > 0)
  })

  test(`${project}: an outer hard clip must still reject the reserved grabber`, async () => {
    const { page, panel, grabber, node } = reservedGrabber(width, height)
    panel.parentElement = node(
      rect(0, height / 2 + 12, width, height / 2 - 12),
      panel.parentElement,
      {},
      { overflowY: "hidden" }
    )
    assert.ok(viewportOverhang(grabber) > 1)
    const [surface] = await visibleFloatingSurfaces(page)
    assert.ok(surface.clipped || surface.clippedDescendants.length > 0)
  })
}
