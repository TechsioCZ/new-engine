import { expect, test, vi } from "vitest"
import { datePickerInputMachine } from "../../src/internal/date-picker-input"

const focusActiveSegment =
  datePickerInputMachine.implementations?.actions?.focusActiveSegment
if (!focusActiveSegment) {
  throw new Error("DatePicker must guard deferred segment focus")
}

function segmentFocusFixture() {
  let pending: FrameRequestCallback | undefined
  const segment = { matches: () => true, focus: vi.fn() }
  const doc = {
    activeElement: segment as unknown,
    defaultView: {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        pending = callback
        return 1
      },
    },
  }
  const control = {
    ownerDocument: doc,
    isConnected: true,
    contains: (node: unknown) => node === segment,
    querySelectorAll: () => [segment],
  }
  const scope = {
    id: "delivery",
    getById: vi.fn(() => control),
  }
  const context = { get: () => 0 }
  const schedule = () => {
    focusActiveSegment?.({ scope, context } as unknown as Parameters<
      typeof focusActiveSegment
    >[0])
  }
  return { doc, control, segment, scope, schedule, tick: () => pending?.(0) }
}

test("the authoritative display checkpoint never sets or proposes a date value", () => {
  expect(Object.entries(datePickerInputMachine.on ?? {})).toContainEqual([
    "AUTHORITATIVE.SYNC",
    { actions: ["syncDisplayValues"] },
  ])
})

test("segment navigation still focuses the next active segment", () => {
  const { schedule, tick, segment, scope } = segmentFocusFixture()
  schedule()
  expect(scope.getById).toHaveBeenCalledWith("date-input:delivery:control")
  expect(segment.focus).not.toHaveBeenCalled()
  tick()
  expect(segment.focus).toHaveBeenCalledWith({ preventScroll: true })
})

test("deferred segment focus yields to the calendar trigger", () => {
  const { schedule, tick, doc, segment } = segmentFocusFixture()
  schedule()
  doc.activeElement = { matches: () => false }
  tick()
  expect(segment.focus).not.toHaveBeenCalled()
})

test("deferred segment focus yields to another DatePicker", () => {
  const { schedule, tick, doc, segment } = segmentFocusFixture()
  schedule()
  doc.activeElement = { matches: () => true }
  tick()
  expect(segment.focus).not.toHaveBeenCalled()
})

test("deferred segment focus never targets unmounted content", () => {
  const { schedule, tick, control, segment } = segmentFocusFixture()
  schedule()
  control.isConnected = false
  tick()
  expect(segment.focus).not.toHaveBeenCalled()
})
