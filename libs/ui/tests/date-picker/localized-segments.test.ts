import { CalendarDate } from "@internationalized/date"
import { type ComponentType, createElement, Fragment } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  DatePicker,
  type DatePickerDayRootProps,
  type DatePickerTranslations,
} from "../../src/molecules/date-picker"

const Picker = DatePicker as ComponentType<DatePickerDayRootProps>

const LABEL_TAG = /<label\b[^>]*>/
const LABEL_FOR_ATTRIBUTE = /\sfor="/
const TRIGGER_TAG = /<button\b[^>]*data-part="trigger"[^>]*>/

function defaultFieldChildren() {
  return [
    createElement(DatePicker.Label, { key: "label" }, "Delivery date"),
    createElement(
      DatePicker.Control,
      { key: "control" },
      createElement(DatePicker.Segments),
      createElement(DatePicker.Trigger)
    ),
    createElement(DatePicker.Calendar, { key: "calendar" }),
  ]
}

function renderField(
  props: Partial<Omit<DatePickerDayRootProps, "children">> = {},
  children = defaultFieldChildren()
) {
  return renderToString(
    createElement(Picker, {
      id: "localized",
      locale: "en-US",
      name: "delivery",
      defaultValue: new CalendarDate(2026, 10, 2),
      ...props,
      // biome-ignore lint/correctness/noChildrenProp: React createElement requires mandatory children in the typed props argument.
      children: createElement(Fragment, null, ...children),
    })
  )
}

function findTag(html: string, pattern: RegExp) {
  return html.match(pattern)?.[0] ?? ""
}

describe("DatePicker localized segment names", () => {
  it("names each editable segment with the translated segment label", () => {
    const translations: DatePickerTranslations = {
      segmentLabels: { day: "Den", month: "Měsíc", year: "Rok" },
    }
    const html = renderField({ translations })
    expect(html).toContain('aria-label="Den"')
    expect(html).toContain('aria-label="Měsíc"')
    expect(html).toContain('aria-label="Rok"')
    expect(html).not.toContain('aria-label="Day"')
  })

  it("keeps the built-in segment names when no segment labels are given", () => {
    const html = renderField()
    expect(html).toContain('aria-label="Day"')
    expect(html).toContain('aria-label="Month"')
    expect(html).toContain('aria-label="Year"')
  })

  it("does not point the label at inputs that are never rendered", () => {
    const html = renderField()
    const label = findTag(html, LABEL_TAG)
    expect(label).not.toBe("")
    expect(label).not.toMatch(LABEL_FOR_ATTRIBUTE)
  })

  it("exposes aria-controls on the trigger only while the calendar is open", () => {
    const closed = findTag(renderField(), TRIGGER_TAG)
    expect(closed).not.toBe("")
    expect(closed).not.toContain("aria-controls")

    const open = findTag(renderField({ defaultOpen: true }), TRIGGER_TAG)
    expect(open).not.toBe("")
    expect(open).toContain("aria-controls=")
  })

  it("forwards calendar translations to zag's date-picker machine", () => {
    const html = renderField(
      {
        defaultOpen: true,
        translations: { content: "Výběr data" },
      },
      [
        createElement(
          DatePicker.Content,
          null,
          createElement(DatePicker.Calendar)
        ),
      ]
    )
    expect(html).toContain('aria-label="Výběr data"')
  })
})
