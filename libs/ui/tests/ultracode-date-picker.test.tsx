import { readFileSync } from "node:fs"
import { CalendarDate } from "@internationalized/date"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  DatePicker,
  type DatePickerDayRootProps,
} from "../src/molecules/date-picker"

const pickerCss = readFileSync(
  new URL(
    "../src/tokens/components/molecules/_date-picker.css",
    import.meta.url
  ),
  "utf8"
)
const controlRules = pickerCss
  .split("@utility date-picker-range-control {")[1]
  ?.split("@utility date-picker-range-segments {")[0]
const captionRules = pickerCss
  .split("@utility date-picker-calendar-caption {")[1]
  ?.split("}")[0]
const indicatorBorderFloor =
  /min-height:\s*calc\(\s*var\(--date-picker-control-indicator-size\)\s*\+\s*max\(\s*var\(--border-width-date-picker-control\),\s*var\(--border-width-validation\)\s*\)\s*\*\s*2\s*\)/

type FixtureProps = Pick<
  DatePickerDayRootProps,
  "disabled" | "dir" | "invalid" | "locale" | "readOnly" | "size"
>

function fixture(props: FixtureProps = {}) {
  return renderToStaticMarkup(
    <DatePicker
      defaultOpen
      defaultValue={new CalendarDate(2026, 9, 30)}
      id="date-picker-presentation"
      {...props}
    >
      <DatePicker.Label>Delivery date</DatePicker.Label>
      <DatePicker.Control>
        <DatePicker.Segments />
        <DatePicker.IndicatorGroup>
          <DatePicker.ClearTrigger />
          <DatePicker.Trigger />
        </DatePicker.IndicatorGroup>
      </DatePicker.Control>
      <DatePicker.Calendar />
    </DatePicker>
  )
}

const openingTags = /<[^/!][^>]*>/g
const buttonElements = /<button\b[^>]*>[\s\S]*?<\/button>/g
const classAttribute = /\bclass="([^"]*)"/
const markupTags = /<[^>]*>/g
const nativeDisabled = /\sdisabled(?:=|\s|>)/

function partTag(html: string, part: string, scope?: string) {
  return (
    html
      .match(openingTags)
      ?.find(
        (tag) =>
          tag.includes(`data-part="${part}"`) &&
          (!scope || tag.includes(`data-scope="${scope}"`))
      ) ?? ""
  )
}

function classes(tag: string) {
  return tag.match(classAttribute)?.[1]?.split(" ") ?? []
}

describe("DatePicker field and calendar presentation", () => {
  it.each(["sm", "md", "lg"] as const)(
    "reserves the %s indicator's complete target plus both field borders",
    (size) => {
      const html = fixture({ size, invalid: true })
      const control = partTag(html, "control", "date-input")
      expect(classes(control)).toContain("date-picker-range-control")
      expect(control).toContain(`data-size="${size}"`)
      expect(control).toContain('data-validation="error"')
      expect(classes(control)).not.toContain("overflow-hidden")
      expect(controlRules).toMatch(indicatorBorderFloor)
      expect(controlRules).toContain(
        `--date-picker-control-indicator-size: var(--size-icon-control-${size});`
      )
      for (const part of ["trigger", "clear-trigger"]) {
        const button = partTag(html, part)
        expect(classes(button)).toContain(`size-icon-control-${size}`)
        expect(button).not.toMatch(nativeDisabled)
      }
    }
  )

  it.each(["cs-CZ", "en-US", "de-DE", "ar-EG"])(
    "retains the complete %s calendar caption without an ellipsis",
    (locale) => {
      const html = fixture({ locale })
      const caption = html
        .match(buttonElements)
        ?.find((button) => button.includes('data-part="view-trigger"'))
      const expectedCaption = new Intl.DateTimeFormat(locale, {
        calendar: "gregory",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date("2026-09-01T00:00:00Z"))
      expect(caption).toBeTruthy()
      expect(caption?.replace(markupTags, "")).toBe(expectedCaption)
      expect(classes(caption ?? "")).toContain("date-picker-calendar-caption")
      expect(classes(caption ?? "")).not.toContain("truncate")
      expect(captionRules).toContain("white-space: normal;")
      expect(captionRules).toContain("overflow-wrap: anywhere;")
      // Keep the existing separate caption row for coarse-pointer calendars.
      expect(html).toContain("date-picker-day-navigation")
      expect(caption).toContain("title=")
    }
  )

  it("preserves RTL indicators and the independent native scroll containers", () => {
    const html = fixture({ dir: "rtl", locale: "ar-EG" })
    expect(html).toContain('dir="rtl"')
    const segments = partTag(html, "segment-group", "date-input")
    expect(classes(segments)).toContain("overflow-x-auto")
    const calendar = partTag(html, "calendar")
    expect(classes(calendar)).toContain("overflow-y-auto")
    expect(classes(calendar)).toContain("min-h-0")
    const selectedDay = html
      .match(openingTags)
      ?.find(
        (tag) =>
          tag.includes('data-part="table-cell-trigger"') &&
          tag.includes('data-value="2026-09-30"') &&
          tag.includes("data-selected=")
      )
    expect(selectedDay).toBeTruthy()
  })

  it("keeps disabled indicators disabled and omits read-only actions", () => {
    const disabled = fixture({ disabled: true })
    for (const part of ["trigger", "clear-trigger"]) {
      const button = partTag(disabled, part)
      expect(button).toMatch(nativeDisabled)
      expect(button).toContain("disabled:text-date-picker-trigger-fg-disabled")
    }
    const readOnly = fixture({ readOnly: true })
    expect(partTag(readOnly, "trigger")).toBe("")
    expect(partTag(readOnly, "clear-trigger")).toBe("")
    expect(readOnly).toContain('role="spinbutton"')
  })
})
