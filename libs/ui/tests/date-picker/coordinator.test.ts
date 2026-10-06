import {
  CalendarDate,
  CalendarDateTime,
  parseZonedDateTime,
  ZonedDateTime,
} from "@internationalized/date"
import { describe, expect, it } from "vitest"
import {
  canConfirmDatePickerDraft,
  createDatePickerCoordinatorState,
  datePickerCoordinatorReducer,
  isDatePickerDraftDirty,
} from "../../src/internal/date-picker-coordinator"

describe("DatePicker transaction coordinator", () => {
  it("copies the accepted value into a clean draft when opened", () => {
    const accepted = new CalendarDateTime(2026, 8, 31, 14, 30)

    const state = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )

    expect(state.draft).toEqual({
      baseline: accepted,
      candidate: accepted,
    })
    expect(isDatePickerDraftDirty(state)).toBe(false)
  })

  it("edits only the private draft and marks it dirty", () => {
    const accepted = new CalendarDateTime(2026, 8, 31, 14, 30)
    const candidate = accepted.set({ minute: 45 })
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )

    const edited = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: candidate,
    })

    expect(edited.draft?.candidate).toBe(candidate)
    expect(edited.draft?.baseline).toBe(accepted)
    expect(isDatePickerDraftDirty(edited)).toBe(true)
  })

  it("discards the draft without producing a value", () => {
    const accepted = new CalendarDateTime(2026, 8, 31, 14, 30)
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )
    const edited = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: accepted.set({ hour: 16 }),
    })

    const discarded = datePickerCoordinatorReducer(edited, {
      type: "discard",
    })

    expect(discarded.draft).toBeNull()
    expect(isDatePickerDraftDirty(discarded)).toBe(false)
  })

  it("replaces an open draft when the accepted controlled value changes", () => {
    const accepted = new CalendarDateTime(2026, 8, 31, 14, 30)
    const external = new CalendarDateTime(2026, 9, 2, 9, 15)
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )
    const edited = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: accepted.set({ minute: 45 }),
    })

    const resynced = datePickerCoordinatorReducer(edited, {
      type: "resync",
      value: external,
    })

    expect(resynced.draft).toEqual({
      baseline: external,
      candidate: external,
    })
    expect(isDatePickerDraftDirty(resynced)).toBe(false)
  })

  it("does not confirm a draft that has not changed", () => {
    const accepted = new CalendarDateTime(2026, 8, 31, 14, 30)
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )

    expect(canConfirmDatePickerDraft(opened)).toBe(false)
  })

  it("does not confirm a selected day until a timed candidate exists", () => {
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: null }
    )
    const daySelected = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: new CalendarDate(2026, 9, 1),
    })

    expect(isDatePickerDraftDirty(daySelected)).toBe(true)
    expect(canConfirmDatePickerDraft(daySelected)).toBe(false)
  })

  it("confirms a changed complete date-time candidate", () => {
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: null }
    )
    const completed = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: new CalendarDateTime(2026, 9, 1, 10, 30),
    })

    expect(canConfirmDatePickerDraft(completed)).toBe(true)
  })

  it("confirms an explicit clear only when it changes a non-empty baseline", () => {
    const accepted = new CalendarDateTime(2026, 9, 1, 10, 30)
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )
    const cleared = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: null,
    })
    const freshEmpty = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: null }
    )

    expect(canConfirmDatePickerDraft(cleared)).toBe(true)
    expect(canConfirmDatePickerDraft(freshEmpty)).toBe(false)
  })

  it("blocks a complete candidate rejected by isTimeUnavailable", () => {
    const candidate = new CalendarDateTime(2026, 9, 1, 10, 30)
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: null }
    )
    const completed = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: candidate,
    })

    expect(
      canConfirmDatePickerDraft(completed, (value) => value.hour === 10)
    ).toBe(false)
  })

  it("keeps time incomplete until every segment required by granularity is entered", () => {
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: null }
    )
    const daySelected = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: new CalendarDate(2026, 9, 1),
    })
    const hourEntered = datePickerCoordinatorReducer(daySelected, {
      type: "edit-time",
      granularity: "minute",
      part: "hour",
      value: 10,
    })

    expect(hourEntered.draft?.candidate).toBeInstanceOf(CalendarDate)
    expect(canConfirmDatePickerDraft(hourEntered)).toBe(false)

    const minuteEntered = datePickerCoordinatorReducer(hourEntered, {
      type: "edit-time",
      granularity: "minute",
      part: "minute",
      value: 30,
    })

    expect(minuteEntered.draft?.candidate).toEqual(
      new CalendarDateTime(2026, 9, 1, 10, 30)
    )
    expect(canConfirmDatePickerDraft(minuteEntered)).toBe(true)
  })

  it("blocks confirmation while a required time segment is cleared", () => {
    const accepted = new CalendarDateTime(2026, 9, 1, 10, 30)
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )
    const minuteCleared = datePickerCoordinatorReducer(opened, {
      type: "edit-time",
      granularity: "minute",
      part: "minute",
      value: null,
    })

    expect(isDatePickerDraftDirty(minuteCleared)).toBe(true)
    expect(canConfirmDatePickerDraft(minuteCleared)).toBe(false)
  })

  it("preserves ZonedDateTime semantics while resolving a DST gap", () => {
    const accepted = parseZonedDateTime(
      "2026-03-08T01:30-05:00[America/New_York]"
    )
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: accepted }
    )

    const edited = datePickerCoordinatorReducer(opened, {
      type: "edit-time",
      granularity: "minute",
      part: "hour",
      value: 2,
    })

    expect(edited.draft?.candidate).toBeInstanceOf(ZonedDateTime)
    expect(edited.draft?.candidate?.toString()).toBe(
      "2026-03-08T03:30:00-04:00[America/New_York]"
    )
    expect(canConfirmDatePickerDraft(edited)).toBe(true)
  })

  it("requires an explicit day period before completing a new 12-hour time", () => {
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: null }
    )
    const daySelected = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: new CalendarDate(2026, 9, 1),
    })
    const hourEntered = datePickerCoordinatorReducer(daySelected, {
      type: "edit-time",
      granularity: "minute",
      hourCycle: 12,
      part: "hour",
      value: 10,
    })
    const minuteEntered = datePickerCoordinatorReducer(hourEntered, {
      type: "edit-time",
      granularity: "minute",
      hourCycle: 12,
      part: "minute",
      value: 30,
    })

    expect(canConfirmDatePickerDraft(minuteEntered)).toBe(false)

    const periodEntered = datePickerCoordinatorReducer(minuteEntered, {
      type: "edit-time",
      granularity: "minute",
      hourCycle: 12,
      part: "dayPeriod",
      value: 12,
    })

    expect(periodEntered.draft?.candidate?.toString()).toBe(
      "2026-09-01T22:30:00"
    )
    expect(canConfirmDatePickerDraft(periodEntered)).toBe(true)
  })
})
