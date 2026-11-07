import { readFileSync } from "node:fs"
import { CalendarDateTime } from "@internationalized/date"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { compile } from "tailwindcss"
import { describe, expect, it } from "vitest"
import { DatePicker } from "../src/molecules/date-picker"

const stylesheet = postcss.parse(
  readFileSync(
    new URL(
      "../src/tokens/components/molecules/_date-picker.css",
      import.meta.url
    ),
    "utf8"
  )
)
const date = new CalendarDateTime(2026, 8, 31, 14, 30, 45)
const blockPaddingDeclaration = /\n\s*padding-block-start:/

function fixture(numOfMonths = 1) {
  return renderToStaticMarkup(
    <DatePicker
      defaultOpen
      defaultValue={date}
      granularity="second"
      numOfMonths={numOfMonths}
    >
      <DatePicker.Content>
        <DatePicker.Calendar
          className="consumer-calendar"
          style={{ paddingBlockStart: "18px", scrollPaddingBlockStart: "75px" }}
        />
        <DatePicker.TimeControl />
        <DatePicker.Footer>
          <DatePicker.CancelTrigger />
          <DatePicker.ConfirmTrigger />
        </DatePicker.Footer>
      </DatePicker.Content>
    </DatePicker>
  )
}

describe("DatePicker constrained navigation context", () => {
  it("keeps selection, viewport bounds, native calendar scrolling, time controls and caller overrides", () => {
    const html = fixture()
    expect(html).toContain("max-h-(--available-height)")
    expect(html).toContain("max-w-date-picker-viewport")
    expect(html).toContain("overflow-y-auto")
    expect(html).toContain("min-h-0")
    expect(html).toContain("consumer-calendar")
    expect(html).toContain("padding-block-start:18px")
    expect(html).toContain("scroll-padding-block-start:75px")
    expect(html).toContain("date-picker-calendar-scroll")
    expect(html).toContain('data-single-panel="true"')
    expect(html).toContain('data-timed="true"')
    expect(html).toContain('data-value="2026-08-31"')
    expect(html).toContain('value="45"')
    expect(html).toContain(">Cancel</button>")
    expect(html).toContain(">Confirm</button>")
  })

  it("does not pin stacked or side-by-side multi-month panels", () => {
    expect(fixture(2)).not.toContain("data-single-panel=")
  })

  it("compiles sticky navigation with a measured native scroll clearance and no added layout height", async () => {
    const rules: string[] = []
    stylesheet.walkAtRules("theme", (rule) => {
      rules.push(rule.toString())
    })
    stylesheet.walkAtRules("utility", (rule) => {
      if (rule.params === "date-picker-calendar-scroll") {
        rules.push(rule.toString())
      }
    })
    const compiler = await compile(`${rules.join("\n")}\n@tailwind utilities;`)
    const generated = compiler.build(["date-picker-calendar-scroll"])
    // Existing token/class/inline padding stays authoritative. The measured
    // inset protects header focus rings without increasing any layout height.
    expect(generated).not.toMatch(blockPaddingDeclaration)
    expect(generated).toContain("--date-picker-calendar-navigation-inset")
    expect(generated).toContain("scroll-padding-block-start:")
    expect(generated).toContain(
      "var(--date-picker-calendar-navigation-height, 0px)"
    )
    expect(generated).toContain("var(--gap-date-picker-calendar)")
    expect(generated).toContain("[data-navigation-pinned]")
    expect(generated).toContain("position: sticky")
    expect(generated).toContain("inset-block-start: 0;")
    expect(generated).toContain("&::before")
    expect(generated).toContain("var(--color-date-picker-navigation-bg)")
    expect(generated).toContain(
      "--color-date-picker-navigation-bg: var(--color-date-picker-surface)"
    )
    expect(generated).not.toContain("overflow: hidden")
    expect(generated).toContain("pointer-events: none") // only the decorative inset cover
  })
})
