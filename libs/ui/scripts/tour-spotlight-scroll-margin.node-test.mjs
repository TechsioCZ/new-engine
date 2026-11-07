import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { runInNewContext } from "node:vm"

// Zag scrolls the bare target into view with block/inline "nearest", then draws
// the spotlight spotlightOffset outside it. The target's scroll margin must
// cover that ring, or a target revealed at a viewport edge clips its spotlight.
const NEAREST_SCROLL =
  /scrollIntoView\(\{[^}]*block: "nearest"[^}]*inline: "nearest"/
const SPOTLIGHT_OFFSET =
  /spotlightOffset: \{ x: (\d+(?:\.\d+)?), y: (\d+(?:\.\d+)?) \}/
const HIGHLIGHTED_RULE = /:where\(\[data-tour-highlighted\]\)\s*\{([^}]*)\}/
const SCROLL_MARGIN = /scroll-margin:\s*(\d+(?:\.\d+)?)px\s*;/

const require = createRequire(import.meta.url)
const zagDist = dirname(require.resolve("@zag-js/tour"))
const machine = readFileSync(join(zagDist, "tour.machine.mjs"), "utf8")
const css = readFileSync(
  new URL("../src/tokens/components/molecules/_tour.css", import.meta.url),
  "utf8"
)

test("highlighted target scroll margin covers Zag's spotlight offset", () => {
  assert.match(
    machine,
    NEAREST_SCROLL,
    "Zag no longer scrolls with nearest; re-check spotlight reveal geometry"
  )
  const offset = machine.match(SPOTLIGHT_OFFSET)
  assert.ok(offset, "Zag spotlightOffset default not found")
  const rule = css.match(HIGHLIGHTED_RULE)
  assert.ok(rule, "_tour.css must style [data-tour-highlighted]")
  const margin = rule[1].match(SCROLL_MARGIN)
  assert.ok(margin, "highlighted target needs a px scroll-margin")
  const [x, y] = [Number(offset[1]), Number(offset[2])]
  assert.ok(Number(margin[1]) >= Math.max(x, y))
})

// Execute the production action without compiling React/Storybook or launching
// a browser. Computed styles model caller rules and the highlighted CSS default.
const source = readFileSync(
  new URL("../src/molecules/tour.tsx", import.meta.url),
  "utf8"
)
const start = source.indexOf("function scrollTargetIntoView(")
const end = source.indexOf("export function Tour({", start)
const MACHINE_BINDING = /useMachine\(tourMachine,/
const SCROLL_FAILURE = /scroll failed/
const ts = require("typescript")
const baseAction = () => undefined
const observers = new Set()
class TargetObserver {
  records = []
  constructor(callback) {
    this.callback = callback
  }
  observe(target) {
    this.target = target
    observers.add(this)
  }
  disconnect() {
    observers.delete(this)
  }
  takeRecords() {
    return this.records.splice(0)
  }
  deliver() {
    this.callback(this.takeRecords())
  }
}
const actions = runInNewContext(
  ts.transpileModule(
    `${source.slice(start, end)}; tourMachine.implementations.actions`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
  ).outputText,
  {
    MutationObserver: TargetObserver,
    machine: {
      implementations: {
        actions: {
          baseAction,
          setResolvedTarget({ context, event, computed }) {
            context.set(
              "resolvedTarget",
              event.node ?? computed("step")?.target?.() ?? null
            )
          },
        },
      },
    },
  }
)
const { scrollToTarget, setResolvedTarget } = actions

test("Tour binds the scroll override without replacing other machine actions", () => {
  assert.ok(start >= 0 && end > start, "Tour scroll action not found")
  assert.match(source, MACHINE_BINDING)
  assert.equal(actions.baseAction, baseAction)
})

function createTarget({ highlighted = false, caller = {}, inline = {} } = {}) {
  const declarations = new Map(
    Object.entries(inline).map(([name, value]) => [name, [value, ""]])
  )
  const style = {
    getPropertyValue: (name) => declarations.get(name)?.[0] ?? "",
    getPropertyPriority: (name) => declarations.get(name)?.[1] ?? "",
    setProperty: (name, value, priority = "") => {
      declarations.set(name, [value, priority])
    },
    removeProperty: (name) => declarations.delete(name),
    get cssText() {
      return JSON.stringify([...declarations])
    },
    set cssText(value) {
      declarations.clear()
      for (const [name, entry] of JSON.parse(value)) {
        declarations.set(name, entry)
      }
    },
  }
  const computed = {
    getPropertyValue: (name) =>
      style.getPropertyValue(name) ||
      caller[name] ||
      (highlighted ? "10px" : "0px"),
  }
  const calls = []
  const target = {
    style,
    ownerDocument: { defaultView: { getComputedStyle: () => computed } },
    scrollIntoView(options) {
      calls.push({
        options: { ...options },
        margins: ["top", "right", "bottom", "left"].map((side) =>
          computed.getPropertyValue(`scroll-margin-${side}`)
        ),
      })
    },
  }
  return { target, calls }
}

function scroll(target, offset = { x: 10, y: 10 }) {
  scrollToTarget({
    context: { get: (key) => (key === "resolvedTarget" ? target : undefined) },
    prop: (key) => (key === "spotlightOffset" ? offset : undefined),
  })
}

for (const highlighted of [false, true]) {
  for (const offset of [
    { x: 10, y: 10 },
    { x: 28, y: 36 },
  ]) {
    test(`reserves ${offset.x}/${offset.y}px before ${highlighted ? "existing" : "late, unhighlighted"} target scroll`, () => {
      const { target, calls } = createTarget({ highlighted })
      const before = target.style.cssText
      scroll(target, offset)
      assert.deepEqual(calls, [
        {
          options: { behavior: "instant", block: "nearest", inline: "nearest" },
          margins: [offset.y, offset.x, offset.y, offset.x].map(
            (value) => `${value}px`
          ),
        },
      ])
      assert.equal(target.style.cssText, before)
    })
  }
}

test("retains larger caller margins independently on each physical axis", () => {
  const { target, calls } = createTarget({
    caller: { "scroll-margin-top": "80px", "scroll-margin-right": "50px" },
    inline: { "scroll-margin-bottom": "40px", "scroll-margin-left": "2px" },
  })
  target.style.setProperty("scroll-margin-left", "2px", "important")
  const before = target.style.cssText
  scroll(target, { x: 28, y: 36 })
  assert.deepEqual(calls[0].margins, ["80px", "50px", "40px", "28px"])
  assert.equal(target.style.cssText, before)
  assert.equal(
    target.style.getPropertyPriority("scroll-margin-left"),
    "important"
  )
})

test("restores exact inline declaration order even when native scrolling throws", () => {
  const { target } = createTarget({
    inline: {
      "scroll-margin-top": "2px",
      "scroll-margin-block-start": "4px",
      color: "red",
    },
  })
  const before = target.style.cssText
  target.scrollIntoView = () => {
    throw new Error("scroll failed")
  }
  assert.throws(() => scroll(target), SCROLL_FAILURE)
  assert.equal(target.style.cssText, before)
})

test("cleanup does not overwrite application writes during scrolling", () => {
  const { target } = createTarget()
  target.scrollIntoView = () => {
    target.style.setProperty("color", "blue")
    target.style.setProperty("scroll-margin-top", "90px")
  }
  scroll(target)
  assert.equal(target.style.getPropertyValue("color"), "blue")
  assert.equal(target.style.getPropertyValue("scroll-margin-top"), "90px")
  assert.equal(target.style.getPropertyValue("scroll-margin-right"), "")
  assert.equal(target.style.getPropertyValue("scroll-margin-bottom"), "")
  assert.equal(target.style.getPropertyValue("scroll-margin-left"), "")
})

test("does not scroll a missing target", () => {
  assert.doesNotThrow(() => scroll(null))
})

function resolveLateTarget({
  initialHighlight,
  previousCleanup,
  fallback = false,
} = {}) {
  const { target } = createTarget()
  const attributes = new Map(
    initialHighlight === undefined
      ? []
      : [["data-tour-highlighted", initialHighlight]]
  )
  const notify = () => {
    for (const observer of observers) {
      if (observer.target === target) {
        observer.records.push({ type: "attributes" })
      }
    }
  }
  Object.assign(target, {
    hasAttribute: (name) => attributes.has(name),
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute(name, value) {
      attributes.set(name, value)
      notify()
    },
    removeAttribute(name) {
      attributes.delete(name)
      notify()
    },
  })
  const refs = new Map([["targetCleanup", previousCleanup]])
  const context = new Map()
  setResolvedTarget({
    context,
    refs,
    event: fallback ? {} : { node: target },
    computed: () => ({ target: () => target }),
  })
  return { target, context, cleanup: () => refs.get("targetCleanup")?.() }
}

for (const fallback of [false, true]) {
  test(`highlights a late ${fallback ? "step fallback" : "event"} target and cleans it up`, () => {
    let previousCleanups = 0
    const { target, context, cleanup } = resolveLateTarget({
      fallback,
      previousCleanup: () => {
        previousCleanups += 1
      },
    })
    assert.equal(context.get("resolvedTarget"), target)
    assert.equal(target.getAttribute("data-tour-highlighted"), "")
    cleanup()
    assert.equal(target.hasAttribute("data-tour-highlighted"), false)
    assert.equal(previousCleanups, 1)
    assert.equal(observers.size, 0)
  })
}

for (const initialHighlight of ["", "application"]) {
  test(`does not own a pre-existing ${JSON.stringify(initialHighlight)} highlight`, () => {
    const { target, cleanup } = resolveLateTarget({ initialHighlight })
    cleanup()
    assert.equal(target.getAttribute("data-tour-highlighted"), initialHighlight)
    assert.equal(observers.size, 0)
  })
}

for (const applicationValue of [null, "", "application"]) {
  test(`preserves application highlight ${JSON.stringify(applicationValue)} written before cleanup`, () => {
    const { target, cleanup } = resolveLateTarget()
    if (applicationValue === null) {
      target.removeAttribute("data-tour-highlighted")
    } else {
      target.setAttribute("data-tour-highlighted", applicationValue)
    }
    cleanup()
    assert.equal(target.getAttribute("data-tour-highlighted"), applicationValue)
    assert.equal(observers.size, 0)
  })
}

test("preserves a delivered same-value application highlight write", () => {
  const { target, cleanup } = resolveLateTarget()
  target.setAttribute("data-tour-highlighted", "")
  for (const observer of observers) {
    observer.deliver()
  }
  cleanup()
  assert.equal(target.getAttribute("data-tour-highlighted"), "")
  assert.equal(observers.size, 0)
})

test("repeated cleanup cannot remove a later application highlight", () => {
  const { target, cleanup } = resolveLateTarget()
  cleanup()
  target.setAttribute("data-tour-highlighted", "")
  cleanup()
  assert.equal(target.getAttribute("data-tour-highlighted"), "")
  assert.equal(observers.size, 0)
})

test("late resolution of a missing target retains the upstream null state", () => {
  const context = new Map()
  const refs = new Map()
  setResolvedTarget({ context, refs, event: {}, computed: () => undefined })
  assert.equal(context.get("resolvedTarget"), null)
  assert.equal(refs.has("targetCleanup"), false)
})
