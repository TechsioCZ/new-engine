import {
  CalendarDate,
  CalendarDateTime,
  GregorianCalendar,
  HebrewCalendar,
  parseZonedDateTime,
  resetLocalTimeZone,
  toCalendar,
} from "@internationalized/date"
import { type ComponentType, createElement, Fragment } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  canConfirmDatePickerDraft,
  createDatePickerCoordinatorState,
  datePickerCoordinatorReducer,
  isDatePickerCandidateAllowed,
} from "../../src/internal/date-picker-coordinator"
import {
  composeDatePickerRefs,
  formatDatePickerCalendar,
  getDatePickerCalendarDate,
  normalizeDatePickerDigits,
  normalizeDatePickerTimeZone,
} from "../../src/internal/date-picker-dom"
import {
  DatePicker,
  type DatePickerDayRootProps,
  type DatePickerTimedRootProps,
} from "../../src/molecules/date-picker"

const POPUP_HOUR = /aria-label="Hour"[^>]*value="23"/
const POPUP_MINUTE = /aria-label="Minute"[^>]*value="30"/
const INPUT_TAGS = /<input\b[^>]*>/g

describe("DatePicker timezone-consistent calendar labels", () => {
  it.each([
    ["2026-03-28T00:30[Europe/Prague]", "UTC", "2026-03-27", "March 2026", 23],
    [
      "2026-03-01T00:30[Europe/Prague]",
      "UTC",
      "2026-02-28",
      "February 2026",
      23,
    ],
    [
      "2026-12-31T23:30[America/Los_Angeles]",
      "Europe/Prague",
      "2027-01-01",
      "January 2027",
      8,
    ],
  ] as const)(
    "normalizes %s into %s before deriving its month",
    (source, timeZone, day, caption, hour) => {
      const instant = parseZonedDateTime(source)
      const normalized = normalizeDatePickerTimeZone(instant, timeZone)
      expect(normalized.toDate(timeZone).getTime()).toBe(
        instant.toDate().getTime()
      )
      expect("hour" in normalized && normalized.hour).toBe(hour)
      const coordinate = getDatePickerCalendarDate(instant, timeZone)
      expect(coordinate.toString()).toBe(day)
      const panel = coordinate.set({ day: 1 })
      expect(
        formatDatePickerCalendar(panel, "en-US", timeZone, {
          month: "long",
          year: "numeric",
        })
      ).toBe(caption)
      expect("hour" in panel).toBe(false)
    }
  )
  it.each([
    ["2026-03-28T00:30[Europe/Prague]", "March 2026", "2026-03-27"],
    ["2026-03-01T00:30[Europe/Prague]", "February 2026", "2026-02-28"],
  ])(
    "renders matching popup coordinates and clock for %s",
    (source, caption, day) => {
      const Picker = DatePicker as ComponentType<DatePickerTimedRootProps>
      const instant = parseZonedDateTime(source)
      const html = renderToString(
        createElement(Picker, {
          id: "cross-zone",
          name: "appointment",
          granularity: "minute",
          hourCycle: 24,
          timeZone: "UTC",
          defaultOpen: true,
          defaultValue: instant,
          // biome-ignore lint/correctness/noChildrenProp: createElement's typed overload requires mandatory children in props.
          children: createElement(
            Fragment,
            null,
            createElement(
              DatePicker.Control,
              null,
              createElement(DatePicker.Segments)
            ),
            createElement(DatePicker.Calendar),
            createElement(DatePicker.TimeControl)
          ),
        })
      )
      expect(html).toContain(`aria-label="${caption}"`)
      expect(html).toContain(`data-value="${day}"`)
      expect(html).toMatch(POPUP_HOUR)
      expect(html).toMatch(POPUP_MINUTE)
      // Merely opening the popup must not rewrite the accepted native wire value.
      const submission = html
        .match(INPUT_TAGS)
        ?.find((input) => input.includes('name="appointment"'))
      expect(submission).toContain(`value="${instant.toString()}"`)
    }
  )
  it("leaves floating dates and times floating", () => {
    const floating = new CalendarDateTime(2026, 3, 1, 0, 30)
    expect(normalizeDatePickerTimeZone(floating, "UTC")).toBe(floating)
    expect(getDatePickerCalendarDate(floating, "UTC").toString()).toBe(
      "2026-03-01"
    )
  })
  it("keeps a non-Gregorian calendar during formatting", () => {
    const date = toCalendar(new CalendarDate(2026, 10, 2), new HebrewCalendar())
    const options = { day: "numeric", month: "long", year: "numeric" } as const
    expect(
      formatDatePickerCalendar(date, "en-US", "Europe/Prague", options)
    ).toBe(
      new Intl.DateTimeFormat("en-US", {
        ...options,
        calendar: date.calendar.identifier,
        timeZone: "Europe/Prague",
      }).format(date.toDate("Europe/Prague"))
    )
  })
  it("preserves the value calendar identifier", () => {
    const date = toCalendar(
      new CalendarDate(2026, 10, 2),
      new GregorianCalendar()
    )
    expect(
      formatDatePickerCalendar(date, "cs-CZ", "Europe/Prague", {
        day: "numeric",
      })
    ).toBe("2.")
  })
})

describe("DatePicker localized input", () => {
  it.each([
    ["ar-EG", "١٢", "12"],
    ["fa-IR", "۱۲", "12"],
    ["ar-EG", "12", "12"],
  ])(
    "normalizes %s without changing canonical ASCII",
    (locale, input, expected) => {
      expect(normalizeDatePickerDigits(input, locale)).toBe(expected)
    }
  )
})

describe("React 19 ref composition", () => {
  it("runs returned cleanup instead of a null call and clears object refs", () => {
    const cleanup = vi.fn()
    const callback = vi.fn(() => cleanup)
    const object = { current: null as object | null }
    const value = {}
    const detach = composeDatePickerRefs(callback, object)(value)
    expect(object.current).toBe(value)
    detach()
    expect(callback).toHaveBeenCalledExactlyOnceWith(value)
    expect(cleanup).toHaveBeenCalledOnce()
    expect(object.current).toBeNull()
  })
  it("calls legacy callback refs with null on detach", () => {
    const callback = vi.fn()
    const detach = composeDatePickerRefs(callback)({})
    detach()
    expect(callback.mock.calls.map(([value]) => value)).toEqual([{}, null])
  })
})

describe("shared DatePicker commit constraints", () => {
  const min = new CalendarDateTime(2026, 8, 31, 10)
  const max = new CalendarDateTime(2026, 8, 31, 17)
  it.each([9, 10, 16, 17, 23])(
    "checks inclusive time bounds at hour %s",
    (hour) => {
      const candidate = min.set({ hour })
      expect(isDatePickerCandidateAllowed(candidate, { min, max })).toBe(
        hour >= 10 && hour <= 17
      )
    }
  )
  it("validates each range endpoint and availability index", () => {
    const unavailable = vi.fn((_value, index) => index === 1)
    expect(
      isDatePickerCandidateAllowed([min, max], {
        isTimeUnavailable: unavailable,
      })
    ).toBe(false)
    expect(unavailable.mock.calls.map(([, index]) => index)).toEqual([0, 1])
    expect(
      isDatePickerCandidateAllowed([min, max.set({ hour: 23 })], { min, max })
    ).toBe(false)
  })
  it("includes the full day for a date-only upper bound", () => {
    expect(
      isDatePickerCandidateAllowed(
        max.set({ hour: 23, minute: 59, second: 59 }),
        { max: new CalendarDate(2026, 8, 31) }
      )
    ).toBe(true)
  })
  it("rechecks changed constraints at confirmation", () => {
    const opened = datePickerCoordinatorReducer(
      createDatePickerCoordinatorState(),
      { type: "open", value: min }
    )
    const edited = datePickerCoordinatorReducer(opened, {
      type: "edit",
      value: max,
    })
    expect(canConfirmDatePickerDraft(edited, undefined, min, max)).toBe(true)
    expect(
      canConfirmDatePickerDraft(edited, undefined, min, max.set({ hour: 16 }))
    ).toBe(false)
  })
})

it("renders identical calendar markup across server host timezones", () => {
  const previous = process.env.TZ
  const Picker = DatePicker as ComponentType<DatePickerDayRootProps>
  const render = () => {
    resetLocalTimeZone()
    return renderToString(
      createElement(Picker, {
        id: "timezone-ssr",
        locale: "cs-CZ",
        timeZone: "Europe/Prague",
        name: "delivery",
        defaultValue: new CalendarDate(2026, 10, 2),
        // biome-ignore lint/correctness/noChildrenProp: React createElement requires mandatory children in the typed props argument.
        children: createElement(
          Fragment,
          null,
          createElement(DatePicker.Label, null, "Delivery date"),
          createElement(
            DatePicker.Control,
            null,
            createElement(DatePicker.Segments)
          ),
          createElement(DatePicker.Calendar)
        ),
      })
    )
  }
  try {
    process.env.TZ = "Europe/Prague"
    const server = render()
    process.env.TZ = "America/Los_Angeles"
    const client = render()
    expect(client).toBe(server)
    expect(server).toContain("říjen 2026")
    expect(server).toContain('name="delivery"')
    expect(server).toContain('value="2026-10-02"')
    expect(server).toContain('data-value="2026-10-02"')
  } finally {
    if (previous === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = previous
    }
    resetLocalTimeZone()
  }
})

// Runs last: it changes process.env.TZ at runtime, which skewed later
// zoned-date assertions in the same worker on UTC hosts such as CI.
describe("DatePicker host timezone independence", () => {
  it.each([
    "UTC",
    "Europe/Prague",
    "America/Los_Angeles",
    "Pacific/Kiritimati",
  ])("does not depend on the host timezone for %s", (timeZone) => {
    const previous = process.env.TZ
    try {
      const dates = [
        new CalendarDate(2026, 1, 1),
        new CalendarDate(2026, 3, 29),
        new CalendarDate(2026, 10, 2),
        new CalendarDate(2026, 12, 31),
      ]
      const render = () =>
        dates.map((date) => ({
          day: formatDatePickerCalendar(date, "en-US", timeZone, {
            day: "numeric",
          }),
          month: formatDatePickerCalendar(date, "en-US", timeZone, {
            month: "long",
            year: "numeric",
          }),
          serialized: date.toString(),
        }))
      process.env.TZ = "Europe/Prague"
      const server = render()
      process.env.TZ = "America/Los_Angeles"
      expect(render()).toEqual(server)
      expect(server.map((label) => label.day)).toEqual(["1", "29", "2", "31"])
      expect(server[2]?.month).toBe("October 2026")
    } finally {
      if (previous === undefined) {
        delete process.env.TZ
      } else {
        process.env.TZ = previous
      }
    }
  })
})
