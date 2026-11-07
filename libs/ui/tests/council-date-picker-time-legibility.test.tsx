import { readFileSync } from "node:fs"
import { CalendarDateTime } from "@internationalized/date"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { compile } from "tailwindcss"
import { describe, expect, it } from "vitest"
import { Input } from "../src/atoms/input"
import { DatePicker } from "../src/molecules/date-picker"

const inputTags = /<input\b[^>]*>/g
const classAttribute = /\bclass="([^"]*)"/
const variable = /var\((--[\w-]+)\)/g
const singleDate = new CalendarDateTime(2026, 8, 31, 14, 30, 45)
const rangeDates = [
  new CalendarDateTime(2026, 9, 5, 9, 30, 15),
  new CalendarDateTime(2026, 9, 18, 17, 45, 30),
] as const

function css(path: string) {
  return postcss.parse(
    readFileSync(new URL(`../src/tokens/${path}`, import.meta.url), "utf8")
  )
}

const datePickerCss = css("components/molecules/_date-picker.css")
const inputCss = css("components/atoms/_input.css")
const businessCss = css("_business.css")

function fixture(range = false) {
  const children = (
    <>
      <DatePicker.TimeControl className="consumer-times" />
      <DatePicker.Footer>
        <DatePicker.CancelTrigger />
        <DatePicker.ConfirmTrigger />
      </DatePicker.Footer>
    </>
  )
  return renderToStaticMarkup(
    <>
      {range ? (
        <DatePicker
          defaultOpen
          defaultValue={[...rangeDates]}
          granularity="second"
          hourCycle={24}
          selectionMode="range"
        >
          {children}
        </DatePicker>
      ) : (
        <DatePicker
          defaultOpen
          defaultValue={singleDate}
          granularity="second"
          hourCycle={24}
        >
          {children}
        </DatePicker>
      )}
      <Input aria-label="Unrelated field" size="sm" />
    </>
  )
}

// Exercise the real Tailwind rule order and token aliases in memory, without
// claiming text metrics or native number-control paint from an SSR test.
async function presentation(html: string) {
  const tags = html.match(inputTags) ?? []
  const classes = tags.flatMap(
    (tag) => tag.match(classAttribute)?.[1]?.split(" ") ?? []
  )
  const source: string[] = []
  for (const stylesheet of [inputCss, datePickerCss]) {
    stylesheet.walkAtRules("theme", (rule) => {
      source.push(rule.toString())
    })
  }
  datePickerCss.walkAtRules("utility", (rule) => {
    if (rule.params === "token-date-picker-time-input") {
      source.push(rule.toString())
    }
  })
  const compiler = await compile(`${source.join("\n")}\n@tailwind utilities;`)
  const generated = postcss.parse(compiler.build(classes))
  const inherited = new Map<string, string>()
  generated.walkRules(":root, :host", (rule) => {
    rule.walkDecls((declaration) => {
      inherited.set(declaration.prop, declaration.value)
    })
  })
  businessCss.walkRules('[data-theme="business"]', (rule) => {
    for (const node of rule.nodes) {
      if (node.type === "decl") {
        inherited.set(node.prop, node.value)
      }
    }
  })

  function properties(tag: string) {
    const candidates = tag.match(classAttribute)?.[1]?.split(" ") ?? []
    const result = new Map(inherited)
    generated.walkRules((rule) => {
      // Top-level class rules have equal specificity. Nested state and native
      // pseudo-element rules do not set the resting input's inline padding.
      if (
        rule.parent === generated &&
        candidates.some((candidate) => rule.selector === `.${candidate}`)
      ) {
        for (const node of rule.nodes) {
          if (node.type === "decl") {
            result.set(node.prop, node.value)
          }
        }
      }
    })
    return result
  }

  function resolve(
    declarations: Map<string, string>,
    property: string
  ): string {
    const value = declarations.get(property) ?? `var(${property})`
    return value.replace(variable, (reference, name: string) =>
      declarations.has(name) ? resolve(declarations, name) : reference
    )
  }

  return { tags, generated, properties, resolve }
}

describe("DatePicker popup time legibility", () => {
  it.each([false, true])(
    "keeps compact inline padding authoritative over the Business Input alias (range=%s)",
    async (range) => {
      const html = fixture(range)
      const { tags, generated, properties, resolve } = await presentation(html)
      const fields = tags.filter((tag) => tag.includes('type="number"'))
      const expectedValues = range ? [9, 30, 15, 17, 45, 30] : [14, 30, 45]
      expect(fields).toHaveLength(expectedValues.length)
      for (const [index, field] of fields.entries()) {
        expect(resolve(properties(field), "padding-inline")).toBe(
          "var(--spacing-50)"
        )
        expect(properties(field).get("appearance")).toBe("textfield")
        expect(field).toContain(`value="${expectedValues[index]}"`)
        expect(field).toContain(`max="${index % 3 === 0 ? 23 : 59}"`)
        expect(field).toContain('inputMode="numeric"')
        expect(field).toContain('step="1"')
        expect(field).toContain('min="0"')
      }
      const spinnerRules: string[] = []
      generated.walkRules((rule) => {
        if (rule.selector.includes("spin-button")) {
          spinnerRules.push(rule.toString())
        }
      })
      expect(spinnerRules.join("\n")).toContain("::-webkit-inner-spin-button")
      expect(spinnerRules.join("\n")).toContain("::-webkit-outer-spin-button")
      expect(spinnerRules.join("\n")).toContain("appearance: none")
      expect(spinnerRules.join("\n")).toContain("margin: 0")
      expect(html).toContain("consumer-times")
      expect(html).toContain(">Cancel</button>")
      expect(html).toContain(">Confirm</button>")
      const unrelated = tags.find((tag) =>
        tag.includes('aria-label="Unrelated field"')
      )
      expect(unrelated).toBeDefined()
      expect(resolve(properties(unrelated ?? ""), "padding-inline")).toBe(
        "var(--dimension-12)"
      )
    }
  )
})
