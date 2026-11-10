import { describe, expect, it } from "vitest"
import { formatDatePickerSegmentAnnouncement } from "../../src/molecules/date-picker"

const day = { type: "day", text: "2", isPlaceholder: false }
const emptyDay = { type: "day", text: "dd", isPlaceholder: true }

describe("DatePicker segment announcements", () => {
  it("keeps zag's English segment names when only emptySegment is translated", () => {
    expect(
      formatDatePickerSegmentAnnouncement(day, { emptySegmentLabel: "Prázdné" })
    ).toBe("Day, 2")
    expect(
      formatDatePickerSegmentAnnouncement(emptyDay, {
        emptySegmentLabel: "Prázdné",
      })
    ).toBe("Day, Prázdné")
  })

  it("falls back to zag's English names for segments missing from a partial segmentLabels", () => {
    const segmentLabels = { day: "Den" }
    expect(formatDatePickerSegmentAnnouncement(day, { segmentLabels })).toBe(
      "Den, 2"
    )
    expect(
      formatDatePickerSegmentAnnouncement(
        { type: "month", text: "10", isPlaceholder: false },
        { segmentLabels }
      )
    ).toBe("Month, 10")
    expect(
      formatDatePickerSegmentAnnouncement(
        { type: "dayPeriod", text: "PM", isPlaceholder: false },
        { segmentLabels }
      )
    ).toBe("AM/PM, PM")
    expect(
      formatDatePickerSegmentAnnouncement(
        { type: "timeZoneName", text: "UTC", isPlaceholder: false },
        {}
      )
    ).toBe("Time zone, UTC")
  })

  it("uses the default Empty word and English names when nothing is translated", () => {
    expect(formatDatePickerSegmentAnnouncement(emptyDay, {})).toBe("Day, Empty")
  })

  it("announces translated names with translated placeholder text", () => {
    expect(
      formatDatePickerSegmentAnnouncement(emptyDay, {
        emptySegmentLabel: "Vide",
        segmentLabels: { day: "Jour" },
      })
    ).toBe("Jour, Vide")
  })
})
