import assert from "node:assert/strict"
import { test } from "node:test"
import { checkStateCheckpoints } from "../libs/ui/test/visual-state-templates-checkpoints.mjs"
import { viewportOverhang } from "../libs/ui/test/visual-viewport.mjs"

const roundingFailure = /1 CSS px rounding/

function rect(left, top, right, bottom) {
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function element(doc, box, parent = doc.body, style = {}) {
  return {
    ownerDocument: doc,
    parentElement: parent,
    getBoundingClientRect: () => box,
    offsetWidth: Math.round(box.width),
    offsetHeight: Math.round(box.height),
    clientLeft: 0,
    clientTop: 0,
    clientWidth: Math.round(box.width),
    clientHeight: Math.round(box.height),
    closest: () => null,
    computedStyle: {
      position: "static",
      display: "block",
      overflowX: "visible",
      overflowY: "visible",
      contain: "none",
      willChange: "auto",
      contentVisibility: "visible",
      ...style,
    },
  }
}

function geometry() {
  const doc = {
    defaultView: { getComputedStyle: (node) => node.computedStyle },
  }
  doc.documentElement = element(doc, rect(0, 0, 393, 659), null)
  doc.body = element(doc, rect(0, 0, 393, 659), doc.documentElement)

  // Case 12's recorded list DOMRect; its three equal-height options are
  // reconstructed, not additional target measurements from the artifact.
  const listTop = 448.666_656_494_140_6
  const listHeight = 75.468_719_482_421_88
  const listBottom = listTop + listHeight
  const list = element(doc, rect(21, listTop, 372, listBottom), doc.body, {
    overflowY: "auto",
  })
  const option = element(
    doc,
    rect(21, listBottom - listHeight / 3, 372, listBottom),
    list
  )

  // Case 13's recorded panel is (8, 341, 308.46875, 216.15625).
  // Reconstruct its unconstrained scroller from the 20px padding, 1px
  // border and fluid close clearance (54.46875px at 393px). The synthetic
  // Save button ends there; the artifact does not record its own DOMRect.
  const scroller = element(doc, rect(29, 362, 261, 536.156_25), doc.body, {
    overflowY: "auto",
    overflowX: "auto",
  })
  const save = element(doc, rect(145, 492.156_25, 261, 536.156_25), scroller)
  return { doc, list, option, scroller, save }
}

function checkpointFixture(clippedTarget, targetOverhang = 1.01) {
  const boxes = geometry()
  const assertions = []
  const actions = []
  const measurements = []
  const captures = []
  if (clippedTarget) {
    const target = boxes[clippedTarget]
    const box = target.getBoundingClientRect()
    target.getBoundingClientRect = () =>
      rect(box.left, box.top, box.right, box.bottom + targetOverhang)
  }

  // Assertion spy for the already-rendered story protocol, not a browser or
  // functional-story substitute. Geometry callbacks execute against the DOM
  // fixture, while the existing visibility/state/accessibility calls are logged.
  class Locator {
    constructor(key) {
      this._apiName = "Locator"
      this.key = key
    }
    filter() {
      return this
    }
    nth(index) {
      return new Locator(`${this.key}:${index}`)
    }
    locator(selector) {
      return new Locator(`${this.key}/${selector}`)
    }
    getByRole(role, options = {}) {
      return new Locator(`${this.key}/${role}:${options.name ?? "all"}`)
    }
    getAttribute(name) {
      return Promise.resolve(
        name === "role" && this.key.includes('data-scope="select"')
          ? "listbox"
          : null
      )
    }
    click() {
      return this.press("click")
    }
    scrollIntoViewIfNeeded() {
      return this.press("scroll")
    }
    focus() {
      return this.press("focus")
    }
    press(action) {
      actions.push({ key: this.key, action })
      return Promise.resolve()
    }
    _expect(expression, options) {
      assert.notEqual(
        expression,
        "to.be.in.viewport",
        "Use strict CSS-pixel geometry, not an intersection ratio"
      )
      assertions.push({ key: this.key, expression })
      return Promise.resolve({ matches: !options.isNot })
    }
    evaluate(callback, argument) {
      if (callback === viewportOverhang) {
        let target = element(boxes.doc, rect(16, 341, 377, 557))
        if (this.key.endsWith("/listbox:all")) {
          target = boxes.list
        } else if (this.key.endsWith("/option:Custom order")) {
          target = boxes.option
        } else if (this.key.endsWith("/button:Save contact")) {
          target = boxes.save
        }
        const overhang = callback(target)
        measurements.push({ key: this.key, overhang })
        return Promise.resolve(overhang)
      }
      return Promise.resolve(
        callback(element(boxes.doc, rect(16, 341, 377, 557)), argument)
      )
    }
  }

  const page = {
    locator: (selector) => new Locator(selector),
    keyboard: { press: (key) => new Locator("keyboard").press(key) },
  }
  const capture = async (suffix, ready) => {
    captures.push(suffix)
    // Exercise the same callback again at the asset and screenshot boundaries.
    await ready()
    await ready()
  }
  return { page, capture, captures, assertions, measurements, actions }
}

for (const [story, target, suffixes] of [
  [
    "templates-comprehensive-form--sizes",
    "/option:Custom order",
    [
      "sm-team",
      "sm-category",
      "md-team",
      "md-category",
      "lg-team",
      "lg-category",
    ],
  ],
  [
    "templates-popover--with-close-button",
    "/button:Save contact",
    ["contact-form"],
  ],
]) {
  test(`${story} keeps every capture and repeats strict geometry plus visibility at readiness boundaries`, async () => {
    const form = story.includes("form--sizes")
    const fixture = checkpointFixture(
      form ? "option" : "save",
      form ? 0.468_719_482_421_88 : 0.156_25
    )
    assert.equal(
      await checkStateCheckpoints(fixture.page, story, fixture.capture),
      true
    )
    assert.deepEqual(
      fixture.captures,
      suffixes.map((suffix) => `--state-${suffix}-open`)
    )
    assert.equal(
      fixture.actions.filter(({ action }) => action === "click").length,
      form ? 3 : 1
    )
    assert.equal(
      fixture.actions.filter(({ action }) => action === "ArrowDown").length,
      form ? 3 : 0
    )
    const checks = fixture.measurements.filter(({ key }) =>
      key.endsWith(target)
    )
    assert.equal(checks.length, form ? 9 : 3)
    assert.ok(checks.every(({ overhang }) => overhang > 0 && overhang <= 1))
    assert.equal(
      fixture.actions.filter(({ action }) => action === "Escape").length,
      suffixes.length
    )
    assert.equal(
      fixture.assertions.filter(
        ({ key, expression }) =>
          key.endsWith(target) && expression === "to.be.visible"
      ).length,
      checks.length
    )
  })
}

test("recorded fractional template scrollports fit without allowing whole pixels of real clipping", () => {
  const { list, option, scroller, save } = geometry()
  assert.ok(
    Math.abs(
      list.getBoundingClientRect().height -
        list.clientHeight -
        0.468_719_482_421_88
    ) < 0.000_001
  )
  assert.equal(scroller.getBoundingClientRect().width - scroller.clientWidth, 0)
  assert.equal(
    scroller.getBoundingClientRect().height - scroller.clientHeight,
    0.156_25
  )
  for (const target of [option, save]) {
    assert.ok(viewportOverhang(target) <= 1)
    const box = target.getBoundingClientRect()
    target.getBoundingClientRect = () =>
      rect(box.left, box.top, box.right, box.bottom + 1)
    assert.equal(viewportOverhang(target), 1)
    target.getBoundingClientRect = () =>
      rect(box.left, box.top, box.right, box.bottom + 1.01)
    assert.ok(viewportOverhang(target) > 1)
  }
})

for (const [story, target] of [
  ["templates-comprehensive-form--sizes", "option"],
  ["templates-popover--with-close-button", "save"],
]) {
  test(`${story} rejects >1 CSS px ancestor clipping before the affected capture`, async () => {
    const fixture = checkpointFixture(target)
    await assert.rejects(
      checkStateCheckpoints(fixture.page, story, fixture.capture),
      roundingFailure
    )
    assert.deepEqual(
      fixture.captures,
      target === "option" ? ["--state-sm-team-open"] : []
    )
    assert.ok(fixture.measurements.some(({ overhang }) => overhang > 1))
  })
}
