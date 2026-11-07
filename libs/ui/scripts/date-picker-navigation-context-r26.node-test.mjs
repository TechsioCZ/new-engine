import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"
import { runInNewContext } from "node:vm"

const source = readFileSync(
  new URL("../src/molecules/date-picker.tsx", import.meta.url),
  "utf8"
)
const helper = source.slice(
  source.indexOf("function revealDatePickerFocusedDay("),
  source.indexOf("function resolveDatePickerHourCycle(")
)
const measurementStart = source.indexOf("  // Keep a single panel's navigation")
const measurement = source.slice(
  measurementStart,
  source.indexOf("  // Placement can shrink the calendar", measurementStart)
)

function reveal({
  scrollPaddingTop = "auto",
  top = 12,
  bottom = 40,
  selected = false,
} = {}) {
  const calls = []
  const day = {
    matches: () => true,
    getBoundingClientRect: () => ({ top, bottom }),
  }
  const calendar = {
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => ({
          paddingTop: "0px",
          paddingBottom: "10px",
          scrollPaddingTop,
        }),
      },
    },
    dataset: { view: "day" },
    clientTop: 1,
    clientHeight: 220,
    getRootNode: () => ({ activeElement: selected ? null : day }),
    contains: (element) => element === day,
    querySelector: () => day,
    getBoundingClientRect: () => ({ top: 0 }),
    scrollBy: ({ top: delta, behavior }) => {
      if (behavior !== "instant") {
        throw new Error("Calendar reveal must not animate native scrolling")
      }
      calls.push(delta)
    },
  }
  runInNewContext(
    `${stripTypeScriptTypes(helper)}\nrevealDatePickerFocusedDay(calendar, selected)`,
    {
      calendar,
      selected,
    }
  )
  return calls
}

test("keyboard reveal clears the complete sticky navigation rather than only the calendar edge", () => {
  assert.deepEqual(reveal({ scrollPaddingTop: "62px" }), [-51])
})

test("the selected last day remains revealed at opening without moving focus or scrolling ancestors", () => {
  assert.deepEqual(
    reveal({ scrollPaddingTop: "62px", top: 218, bottom: 246, selected: true }),
    [35]
  )
})

test("a day already below the navigation does not scroll", () => {
  assert.deepEqual(
    reveal({ scrollPaddingTop: "62px", top: 70, bottom: 98 }),
    []
  )
})

test("an unpinned calendar keeps the existing nearest-edge geometry", () => {
  assert.deepEqual(reveal({ top: -10, bottom: 18 }), [-11])
})

function measure({ open = true, numOfMonths = 1, calendarHeight = 220 } = {}) {
  if (measurementStart < 0) {
    throw new Error("The navigation needs measured scroll clearance")
  }
  let height = 54
  let rowHeight = 28
  const declarations = new Map()
  const attributes = new Set()
  const observed = []
  const reveals = []
  let notify
  let disconnected = false
  const navigation = { getBoundingClientRect: () => ({ height }) }
  const day = { getBoundingClientRect: () => ({ height: rowHeight }) }
  const calendar = {
    clientHeight: calendarHeight,
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => ({
          rowGap: "4px",
          paddingTop: "10px",
          paddingBottom: "10px",
        }),
      },
    },
    querySelector: (selector) =>
      selector.includes("view-control") ? navigation : day,
    style: {
      setProperty: (name, value) => declarations.set(name, value),
      removeProperty: (name) => declarations.delete(name),
    },
    toggleAttribute: (name, enabled) =>
      enabled ? attributes.add(name) : attributes.delete(name),
    removeAttribute: (name) => attributes.delete(name),
  }
  let cleanup
  runInNewContext(stripTypeScriptTypes(measurement), {
    calendarRef: { current: calendar },
    pickerApi: { open, view: "day" },
    numOfMonths,
    activePanelIndex: null,
    panelMonths: [],
    revealDatePickerFocusedDay: (element, revealSelected = false) => {
      reveals.push({ element, revealSelected })
    },
    ResizeObserver: class {
      constructor(callback) {
        notify = callback
      }
      observe(element) {
        observed.push(element)
      }
      disconnect() {
        disconnected = true
      }
    },
    useLayoutEffect: (callback) => {
      cleanup = callback()
    },
  })
  return {
    calendar,
    navigation,
    day,
    declarations,
    attributes,
    observed,
    reveals,
    pinned: () => attributes.has("data-navigation-pinned"),
    resizeNavigation(next) {
      height = next
      notify?.()
    },
    resizeDay(next) {
      rowHeight = next
      notify?.()
    },
    cleanup: () => cleanup?.(),
    disconnected: () => disconnected,
  }
}

test("wrapped and coarse-pointer navigation contributes its actual height to native scroll padding", () => {
  const f = measure()
  assert.equal(f.pinned(), true)
  assert.equal(
    f.declarations.get("--date-picker-calendar-navigation-height"),
    "54px"
  )
  assert.equal(
    f.declarations.get("--date-picker-calendar-navigation-inset"),
    "10px"
  )
  assert.deepEqual(f.observed, [f.calendar, f.navigation, f.day])
  f.resizeNavigation(86)
  assert.equal(
    f.declarations.get("--date-picker-calendar-navigation-height"),
    "86px"
  )
  assert.equal(f.pinned(), true)
  assert.deepEqual(
    f.reveals,
    [
      { element: f.calendar, revealSelected: false },
      { element: f.calendar, revealSelected: false },
    ],
    "resizing clears focused days without taking ownership from user scroll or reselecting"
  )
  f.cleanup()
  assert.equal(f.disconnected(), true)
  assert.equal(f.attributes.size, 0)
  assert.equal(f.declarations.size, 0)
})

test("a popup too short for navigation plus a complete day falls back to ordinary scrolling", () => {
  const f = measure({ calendarHeight: 106 })
  assert.equal(f.pinned(), true, "10 + 54 + 4 + 28 + 10 fits exactly")
  f.resizeDay(44)
  assert.equal(f.pinned(), false, "larger touch targets must remain reachable")
  f.resizeNavigation(20)
  assert.equal(f.pinned(), true)
  f.cleanup()
})

for (const options of [{ open: false }, { numOfMonths: 2 }]) {
  test(`closed or multi-panel calendars retain their existing scroll ownership: ${JSON.stringify(options)}`, () => {
    const f = measure(options)
    assert.equal(f.pinned(), false)
    assert.equal(f.observed.length, 0)
    assert.equal(f.declarations.size, 0)
  })
}
