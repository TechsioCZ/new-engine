// biome-ignore-all lint/suspicious/noMisplacedAssertion: Locator fixtures validate checkpoint calls during the tests below.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"
import { Script } from "node:vm"
import {
  captureCheckpointImage,
  checkStoryPopupCheckpoints,
} from "../test/visual-popup-capture.mjs"
import { checkStateCheckpoints } from "../test/visual-state-organisms-checkpoints.mjs"

const roundingFailure = /1 CSS px rounding/
const clippingFailure = /ancestor clips/
const coveredFailure = /Control is covered/

function box(left, top, right, bottom) {
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

function documentFixture() {
  const doc = {
    defaultView: { getComputedStyle: (node) => node.style },
  }
  doc.documentElement = element(doc, () => box(0, 0, 393, 659), null)
  doc.body = element(doc, () => box(0, 0, 393, 659), doc.documentElement)
  return doc
}

function element(doc, bounds, parent = doc.body) {
  return {
    ownerDocument: doc,
    parentElement: parent,
    getBoundingClientRect: bounds,
    get offsetWidth() {
      return bounds().width
    },
    get offsetHeight() {
      return bounds().height
    },
    get clientWidth() {
      return bounds().width
    },
    get clientHeight() {
      return bounds().height
    },
    clientLeft: 0,
    clientTop: 0,
    closest: () => null,
    style: {
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
    },
    visible: true,
    disabled: false,
    attributes: {},
  }
}

// Run the real checkpoint and serialized geometry callbacks without a browser.
// Only Playwright's locator transport is replaced; unsupported assertions fail.
class Locator {
  _apiName = "Locator"
  constructor(nodes) {
    this.nodes = typeof nodes === "function" ? nodes : () => nodes
  }
  async _expect(expression, options) {
    const nodes = this.nodes()
    const target = nodes[0]
    let received
    let expected = true
    switch (expression) {
      case "to.have.count":
        received = nodes.length
        expected = options.expectedNumber
        break
      case "to.be.visible":
        received = !!target?.visible
        break
      case "to.be.hidden":
        received = !target?.visible
        break
      case "to.be.enabled":
        received = !target.disabled
        break
      case "to.be.disabled":
        received = target.disabled
        break
      case "to.be.focused":
        await target.focusSettled
        received = target.focused
        break
      case "to.have.value":
        received = target.value
        expected = options.expectedText[0].string
        break
      case "to.have.attribute.value":
        received = target.attributes[options.expressionArg]
        expected = options.expectedText[0].string
        break
      default:
        assert.fail(`Unexpected assertion: ${expression}`)
    }
    return { matches: received === expected, received, log: [] }
  }
  evaluate(callback) {
    return Promise.resolve(
      new Script(`(${callback.toString()})(element)`).runInNewContext({
        element: this.nodes()[0],
      })
    )
  }
  async scrollIntoViewIfNeeded() {
    await this.nodes()[0].scroll?.()
  }
  async click(options) {
    const target = this.nodes()[0]
    assert.ok(target.visible, "Control is hidden")
    assert.ok(!target.disabled, "Control is disabled")
    assert.ok(!target.covered, "Control is covered")
    if (options?.trial) {
      target.trials = (target.trials ?? 0) + 1
    } else {
      await target.click()
    }
  }
  getAttribute(name) {
    return Promise.resolve(this.nodes()[0].attributes[name])
  }
  isVisible() {
    return Promise.resolve(this.nodes()[0].visible)
  }
  first() {
    return this.nth(0)
  }
  nth(index) {
    return new Locator(() => [this.nodes()[index]])
  }
  all() {
    return Promise.resolve(this.nodes().map((node) => new Locator([node])))
  }
  getByRole(role, options) {
    return this.nodes()[0].getByRole(role, options)
  }
}

function headerFixture({
  overhang = 3.3,
  clip = false,
  coveredLink = false,
} = {}) {
  const doc = documentFixture()
  let scrollY = 0
  const panels = []
  const triggers = []
  const links = []
  const scrolls = []
  for (const size of ["sm", "md", "lg"]) {
    const parent = element(doc, () => box(0, 0, 393, 658))
    parent.style.position = "relative"
    if (clip) {
      parent.style.overflowY = "hidden"
    }
    const panel = element(
      doc,
      () => box(0, 459 + overhang - scrollY, 393, 659 + overhang - scrollY),
      parent
    )
    panel.style.position = "absolute"
    panel.visible = false
    panel.attributes["data-open"] = "false"
    panel.scroll = () => {
      scrollY = 3
      scrolls.push(size)
    }
    const navigation = element(doc, panel.getBoundingClientRect, panel)
    const items = [0, 1, 2].map((index) => {
      const link = element(
        doc,
        () =>
          box(
            158,
            479 + overhang - scrollY + index * 60,
            240,
            500 + overhang - scrollY + index * 60
          ),
        navigation
      )
      link.covered = coveredLink
      return link
    })
    const trigger = element(doc, () => box(340, 400, 380, 440))
    trigger.attributes = {
      "aria-expanded": "false",
      "aria-controls": `menu-${size}`,
    }
    trigger.click = () => {
      panel.visible = !panel.visible
      panel.attributes["data-open"] = String(panel.visible)
      trigger.attributes["aria-expanded"] = String(panel.visible)
    }
    panel.getByRole = (role, options) => {
      assert.equal(role, "navigation")
      assert.equal(options.name, `Header ${size} mobile navigation`)
      return new Locator([navigation])
    }
    navigation.getByRole = (role) => {
      assert.equal(role, "link")
      return new Locator(items)
    }
    panels.push(panel)
    triggers.push(trigger)
    links.push(...items)
  }
  return {
    panels,
    links,
    scrolls,
    resetScroll() {
      scrollY = 0
    },
    page: {
      locator(selector) {
        if (selector.includes("Toggle mobile menu")) {
          return new Locator(triggers)
        }
        const index = ["sm", "md", "lg"].findIndex(
          (size) => selector === `[id="menu-${size}"]`
        )
        assert.notEqual(index, -1, selector)
        return new Locator([panels[index]])
      },
    },
  }
}

function tableFixture({
  hiddenSave = false,
  coveredSave = false,
  unreachableSave = false,
} = {}) {
  const doc = documentFixture()
  let editing = false
  let focusSettled = false
  let scrollLeft = 0
  const scrolls = []
  const scroller = element(doc, () => box(16, 16, 377, 500))
  scroller.style.overflowX = "auto"
  const control = (left, right) =>
    element(
      doc,
      () => box(left - scrollLeft, 130, right - scrollLeft, 174),
      scroller
    )
  const name = control(80, 280)
  name.value = "Ada Lovelace"
  const save = control(
    unreachableSave ? 1800 : 1400,
    unreachableSave ? 1844 : 1444
  )
  save.visible = !hiddenSave
  save.covered = coveredSave
  const cancel = control(1450, 1494)
  for (const [label, target, left] of [
    ["name", name, 80],
    ["save", save, 1400],
  ]) {
    target.scroll = () => {
      assert.ok(focusSettled, "Scroll must wait for editor autofocus")
      scrollLeft = Math.min(1169, Math.max(0, left - 36))
      scrolls.push(label)
    }
  }
  const checkbox = control(20, 40)
  const salary = control(900, 1000)
  const department = control(350, 550)
  const edit = control(1400, 1444)
  edit.click = () => {
    editing = true
    for (const target of [checkbox, salary, department]) {
      target.disabled = true
    }
    name.focusSettled = new Promise((resolve) =>
      setImmediate(() => {
        focusSettled = true
        name.focused = true
        scrollLeft = 44
        resolve()
      })
    )
  }
  cancel.click = () => {
    editing = false
    for (const target of [checkbox, salary, department]) {
      target.disabled = false
    }
  }
  const controls = new Map([
    ["button:Edit row 0", edit],
    ["textbox:Edit Name", name],
    ["button:Save row", save],
    ["button:Cancel edit", cancel],
    ["checkbox:Select row 0", checkbox],
    ["button:Salary", salary],
    ["combobox:Filter Department", department],
  ])
  return {
    scrolls,
    name,
    save,
    cancel,
    get editing() {
      return editing
    },
    resetScroll() {
      scrollLeft = 44
    },
    page: {
      getByRole(role, options) {
        assert.equal(options.exact, true)
        const target = controls.get(`${role}:${options.name}`)
        assert.ok(target, `${role}:${options.name}`)
        return new Locator(() => (target === name && !editing ? [] : [target]))
      },
    },
  }
}

const framing = {
  includesMarkers: false,
  bounds: { x: 0, y: 0, width: 393, height: 500 },
}
const screenshotOptions = {
  animations: "disabled",
  caret: "hide",
  scale: "css",
}

async function captureWithReadiness(suffix, ready, appearance, screenshot) {
  assert.equal(typeof ready, "function", suffix)
  return await captureCheckpointImage(
    { screenshot: screenshot ?? (async () => Buffer.from("page")) },
    {
      screenshot: () =>
        assert.fail("Prepared capture must not scroll the root"),
    },
    screenshotOptions,
    { fullPage: false, framing, tile: null, ready, appearance }
  )
}

test("Header scrolls all three opened menus and accepts only subpixel remainder", async () => {
  const fixture = headerFixture()
  const suffixes = []
  await checkStateCheckpoints(
    fixture.page,
    "organisms-header--sizes",
    async (suffix, ready, appearance) => {
      suffixes.push(suffix)
      await captureWithReadiness(suffix, ready, appearance)
    }
  )
  assert.deepEqual(suffixes, [
    "--state-mobile-navigation-sm-open",
    "--state-mobile-navigation-md-open",
    "--state-mobile-navigation-lg-open",
  ])
  assert.ok(fixture.panels.every((panel) => !panel.visible))
  assert.ok(fixture.links.every((link) => link.trials === 2))
  assert.deepEqual(fixture.scrolls, ["sm", "sm", "md", "md", "lg", "lg"])
})

test("Header rejects real viewport overhang beyond the unchanged 1px budget", async () => {
  const fixture = headerFixture({ overhang: 5.1 })
  await assert.rejects(
    checkStateCheckpoints(fixture.page, "organisms-header--sizes", () =>
      assert.fail("Clipped capture")
    ),
    roundingFailure
  )
})

test("Header rejects ancestor clipping even after normal page scrolling", async () => {
  const fixture = headerFixture({ clip: true })
  await assert.rejects(
    checkStateCheckpoints(fixture.page, "organisms-header--sizes", () =>
      assert.fail("Clipped capture")
    ),
    clippingFailure
  )
})

test("Header navigation must also be hit-testable, not merely geometrically contained", async () => {
  const fixture = headerFixture({ coveredLink: true })
  await assert.rejects(
    checkStateCheckpoints(fixture.page, "organisms-header--sizes", () =>
      assert.fail("Covered capture")
    ),
    coveredFailure
  )
})

test("wide mobile table captures the editor and real actions using normal scrolling", async () => {
  const fixture = tableFixture()
  const suffixes = []
  await checkStateCheckpoints(
    fixture.page,
    "organisms-datatable--edit-mode-locks-interactions",
    async (suffix, ready, appearance) => {
      suffixes.push(suffix)
      assert.equal(fixture.editing, true)
      await captureWithReadiness(suffix, ready, appearance)
    }
  )
  assert.deepEqual(suffixes, [
    "--state-edit-lock-open",
    "--state-edit-lock-actions-open",
  ])
  assert.deepEqual(fixture.scrolls, ["name", "name", "save", "save"])
  assert.equal(fixture.save.trials, 2)
  assert.equal(fixture.cancel.trials, 2)
  assert.equal(fixture.editing, false)
})

for (const [option, message] of [
  ["hiddenSave", /toBeVisible|Control is hidden/],
  ["coveredSave", /Control is covered/],
  ["unreachableSave", /ancestor clips/],
]) {
  test(`wide table does not excuse ${option}`, async () => {
    const fixture = tableFixture({ [option]: true })
    const captured = []
    await assert.rejects(
      checkStateCheckpoints(
        fixture.page,
        "organisms-datatable--edit-mode-locks-interactions",
        async (suffix, ready, appearance) => {
          captured.push(suffix)
          await captureWithReadiness(suffix, ready, appearance)
        }
      ),
      message
    )
    assert.deepEqual(captured, ["--state-edit-lock-open"])
  })
}

// These execute the real producer, forwarding wrapper, geometry and screenshot
// consumer. Scroll drift is injected at transport boundaries, not browser proof.
for (const [id, makeFixture] of [
  ["organisms-header--sizes", headerFixture],
  ["organisms-datatable--edit-mode-locks-interactions", tableFixture],
]) {
  test(`${id} prepares each appearance after capture setup, without mutating ready`, async () => {
    const fixture = makeFixture()
    const captured = []
    await checkStoryPopupCheckpoints(
      fixture.page,
      id,
      async (suffix, ready, appearance) => {
        assert.equal(typeof appearance.prepare, "function")
        // The old prepare-once implementation failed when capture setup moved
        // scroll positions between the producer and visual.spec's final gate.
        fixture.resetScroll()
        await captureWithReadiness(
          suffix,
          ready,
          appearance,
          async (options) => {
            captured.push(suffix)
            assert.equal(options.fullPage, true)
            if (id === "organisms-header--sizes") {
              assert.equal(
                options.clip,
                undefined,
                "Keep the absolute menu in the PNG"
              )
            } else {
              assert.deepEqual(options.clip, framing.bounds)
            }
            const scrolls = [...fixture.scrolls]
            const trials = fixture.links
              ? fixture.links.map((link) => link.trials)
              : [fixture.save.trials, fixture.cancel.trials]
            await ready()
            await ready()
            assert.deepEqual(
              fixture.scrolls,
              scrolls,
              "Ready must not navigate"
            )
            assert.deepEqual(
              fixture.links
                ? fixture.links.map((link) => link.trials)
                : [fixture.save.trials, fixture.cancel.trials],
              trials,
              "Trial clicks can scroll and belong in preparation, not ready"
            )
            return Buffer.from("page")
          }
        )
      }
    )
    assert.equal(captured.length, id === "organisms-header--sizes" ? 3 : 2)
  })

  test(`${id} rejects screenshot-induced drift instead of repairing it after the PNG`, async () => {
    const fixture = makeFixture()
    let screenshots = 0
    await assert.rejects(
      checkStoryPopupCheckpoints(
        fixture.page,
        id,
        async (suffix, ready, appearance) => {
          // The first table appearance remains valid at its editor origin;
          // reset the actions appearance, whose clipping is the v5 failure.
          const drift =
            id === "organisms-header--sizes" || suffix.includes("actions")
          await captureWithReadiness(suffix, ready, appearance, () => {
            screenshots += 1
            if (drift) {
              fixture.resetScroll()
            }
            return Promise.resolve(Buffer.from("page"))
          })
        }
      ),
      roundingFailure
    )
    assert.equal(screenshots, id === "organisms-header--sizes" ? 1 : 2)
    // No post-screenshot prepare can conceal a frame captured in the wrong view.
    assert.equal(fixture.scrolls.length, screenshots * 2)
  })
}

test("installed Playwright locator screenshots scroll after screenshot preparation", () => {
  const require = createRequire(import.meta.url)
  const playwright = createRequire(require.resolve("@playwright/test"))
  const core = new URL(
    "./lib/coreBundle.js",
    pathToFileURL(playwright.resolve("playwright-core"))
  )
  const source = readFileSync(core, "utf8")
  const elementScreenshot = source.slice(
    source.indexOf("async screenshotElement("),
    source.indexOf("async _preparePageForScreenshot(")
  )
  assert.ok(
    elementScreenshot.includes("await handle._waitAndScrollIntoViewIfNeeded(")
  )
  assert.ok(
    elementScreenshot.indexOf("await this._preparePageForScreenshot(") <
      elementScreenshot.indexOf("await handle._waitAndScrollIntoViewIfNeeded(")
  )
})

test("visual capture consumes preparation only after asset/theme setup and keeps floating checks separate", () => {
  const source = readFileSync(
    new URL("../test/visual.spec.ts", import.meta.url),
    "utf8"
  )
  const capture = source.slice(
    source.indexOf("const capture = async ("),
    source.indexOf("// Locator screenshots scroll oversized roots")
  )
  const consume = capture.indexOf("await captureCheckpointImage(")
  for (const setup of [
    "await waitForAssets(",
    "await assertThemeTokens(",
    "await root.evaluate(",
  ]) {
    assert.ok(capture.indexOf(setup) >= 0, setup)
    assert.ok(capture.indexOf(setup) < consume, setup)
  }
  assert.ok(
    capture.includes("const captureFullPage = fullPage || appearance?.fullPage")
  )
  assert.ok(capture.includes("if (fullPage && suffix)"))
  assert.ok(capture.includes("appearance,"))
  assert.ok(
    source.includes(
      "await capture(suffix, floating, beforeCapture, appearance)"
    )
  )
  // Theme verification really removes/restores the theme inside capture setup;
  // no trace records which specific layout operation clamped the table's scroll.
  assert.ok(source.includes('html.removeAttribute("data-theme")'))
  assert.ok(source.includes('html.setAttribute("data-theme", attribute)'))
})

test("unprepared, marker, full-page and tiled capture modes keep their original framing", async () => {
  const calls = []
  const page = {
    screenshot: (options) => {
      calls.push(["page", options])
      return Promise.resolve(Buffer.from("page"))
    },
  }
  const root = {
    screenshot: (options) => {
      calls.push(["root", options])
      return Promise.resolve(Buffer.from("root"))
    },
  }
  for (const state of [
    { fullPage: false, framing, tile: null },
    { fullPage: true, framing: null, tile: null },
    {
      fullPage: false,
      framing: { ...framing, includesMarkers: true },
      tile: null,
    },
    { fullPage: false, framing, tile: { clip: framing.bounds } },
  ]) {
    await captureCheckpointImage(page, root, screenshotOptions, state)
  }
  assert.deepEqual(calls, [
    ["root", screenshotOptions],
    ["page", { ...screenshotOptions, fullPage: true }],
    ["page", { ...screenshotOptions, fullPage: true, clip: framing.bounds }],
    ["page", { ...screenshotOptions, fullPage: true, clip: framing.bounds }],
  ])
})
