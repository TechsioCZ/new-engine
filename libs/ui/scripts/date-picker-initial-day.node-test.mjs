import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"
import { runInNewContext } from "node:vm"

// Execute only the production geometry helper and Calendar effect. No React,
// compiler, layout engine or browser: real clip geometry is covered by Playwright.
const source = readFileSync(
  new URL("../src/molecules/date-picker.tsx", import.meta.url),
  "utf8"
)
const helper = source.slice(
  source.indexOf("function revealDatePickerFocusedDay("),
  source.indexOf("function resolveDatePickerHourCycle(")
)
const effectStart = source.indexOf("  // Placement can shrink the calendar")
const effect = source.slice(
  effectStart,
  source.indexOf("  // biome-ignore", effectStart)
)
test("the opening lifecycle is keyed by open state for force-mounted calendars", () => {
  assert.ok(effectStart >= 0 && helper.length > 0)
  assert.ok(
    effect.includes("[pickerApi.open]"),
    "force-mounted reopen must reset"
  )
})

function fixture({ placed = false, open = true, shadow = false } = {}) {
  const frames = new Map()
  const resizeObservers = []
  const mutationObservers = []
  let nextFrame = 0
  const observer = (list) =>
    class {
      disconnected = false
      constructor(callback) {
        this.callback = callback
        list.push(this)
      }
      observe(target) {
        this.target = target
      }
      disconnect() {
        this.disconnected = true
      }
      notify() {
        if (!this.disconnected) {
          this.callback()
        }
      }
    }
  const view = {
    requestAnimationFrame(callback) {
      nextFrame += 1
      frames.set(nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame(id) {
      frames.delete(id)
    },
    getComputedStyle: () => ({ paddingTop: "8px", paddingBottom: "8px" }),
    MutationObserver: observer(mutationObservers),
  }
  const content = new EventTarget()
  const calendar = new EventTarget()
  const positioner = {
    style: {
      getPropertyValue: () => (placed ? "367px" : ""),
    },
  }
  const root = { activeElement: null }
  const document = {
    defaultView: view,
    activeElement: shadow ? { matches: () => false } : null,
  }
  const calls = []
  const selected = {
    matches: () => true,
    getBoundingClientRect: () => ({
      top: 218 - calendar.scrollTop,
      bottom: 246 - calendar.scrollTop,
    }),
  }
  const focused = {
    matches: () => true,
    getBoundingClientRect: () => ({
      top: -18 - calendar.scrollTop,
      bottom: 10 - calendar.scrollTop,
    }),
  }
  const navigation = { matches: () => false }
  Object.assign(calendar, {
    ownerDocument: document,
    dataset: { view: "day" },
    clientTop: 0,
    clientHeight: 228,
    scrollTop: 0,
    getRootNode: () => root,
    contains: (element) => [selected, focused, navigation].includes(element),
    closest: (selector) =>
      selector.includes("positioner") ? positioner : content,
    querySelector: (selector) => {
      if (!selector.includes("[data-selected]:not([data-outside-range])")) {
        throw new Error(
          "Initial reveal must ignore duplicate outside-month days"
        )
      }
      return selected
    },
    getBoundingClientRect: () => ({ top: 0 }),
    scrollBy: ({ top, behavior }) => {
      if (behavior !== "instant") {
        throw new Error("Calendar reveal must finish without smooth scrolling")
      }
      calls.push(top)
      calendar.scrollTop += top
    },
  })
  let cleanup
  runInNewContext(stripTypeScriptTypes(`${helper}\n${effect}`), {
    calendarRef: { current: calendar },
    pickerApi: { open },
    ResizeObserver: observer(resizeObservers),
    useEffect: (callback) => {
      cleanup = callback()
    },
  })
  return {
    calendar,
    content,
    root,
    selected,
    focused,
    navigation,
    calls,
    frames,
    resizeObservers,
    mutationObservers,
    cleanup: () => cleanup?.(),
    place() {
      placed = true
      mutationObservers[0]?.notify()
    },
    flush() {
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) {
        callback()
      }
    },
  }
}

test("pointer opening waits for sizing, reveals the selected day once, and leaves focus alone", () => {
  const f = fixture()
  f.flush()
  assert.deepEqual(f.calls, [])
  f.place()
  f.flush()
  assert.deepEqual(f.calls, [26])
  assert.equal(f.root.activeElement, null)
  assert.equal(f.mutationObservers[0].disconnected, true)
  f.calendar.scrollTop = 0
  f.resizeObservers[0].notify()
  f.flush()
  assert.deepEqual(f.calls, [26], "later resize must not reselect")
  f.cleanup()
})

test("already-sized opening reveals selection even without a resize notification", () => {
  const f = fixture({ placed: true })
  f.flush()
  assert.deepEqual(f.calls, [26])
  f.cleanup()
})

for (const event of [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
]) {
  test(`${event} gives ownership to the user before initial placement completes`, () => {
    const f = fixture()
    const target = event === "scroll" ? f.calendar : f.content
    target.dispatchEvent(new Event(event))
    f.place()
    f.resizeObservers[0].notify()
    f.flush()
    assert.deepEqual(f.calls, [])
    f.cleanup()
  })
}

test("focused keyboard day wins over selection, using the shadow root active element", () => {
  const f = fixture({ placed: true, shadow: true })
  f.root.activeElement = f.focused
  f.flush()
  assert.deepEqual(f.calls, [-26])
  f.calendar.scrollTop = 0
  f.calendar.dispatchEvent(new Event("focusin"))
  f.flush()
  assert.deepEqual(f.calls, [-26, -26])
  f.cleanup()
})

test("navigation focus and period views do not pull the calendar back to selection", () => {
  for (const mode of ["navigation", "month", "year"]) {
    const f = fixture({ placed: true })
    if (mode === "navigation") {
      f.root.activeElement = f.navigation
    } else {
      f.calendar.dataset.view = mode
    }
    f.flush()
    assert.deepEqual(f.calls, [])
    f.cleanup()
  }
})

test("closed force-mounted calendars do not observe or schedule scrolling", () => {
  const f = fixture({ open: false })
  assert.equal(f.frames.size, 0)
  assert.equal(f.resizeObservers.length, 0)
  assert.equal(f.mutationObservers.length, 0)
})

test("cleanup cancels the pending frame and detaches observers and listeners", () => {
  const f = fixture()
  assert.equal(f.frames.size, 1)
  f.cleanup()
  assert.equal(f.frames.size, 0)
  assert.ok(f.resizeObservers.every((item) => item.disconnected))
  assert.ok(f.mutationObservers.every((item) => item.disconnected))
  f.calendar.dispatchEvent(new Event("focusin"))
  assert.equal(f.frames.size, 0)
})
