import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { Combobox } from "../src/molecules/combobox"

const COMBOBOX_INPUT = /<input\b[^>]*role="combobox"[^>]*>/
const COMBOBOX_LABEL = /<label\b[^>]*class="([^"]*)"/

it("uses the explicit md label size when size is omitted", () => {
  const props = { items: [], label: "Country" }
  const defaultHtml = renderToStaticMarkup(h(Combobox, props))
  const mediumHtml = renderToStaticMarkup(h(Combobox, { ...props, size: "md" }))
  const defaultLabel = defaultHtml.match(COMBOBOX_LABEL)?.[1]
  const mediumLabel = mediumHtml.match(COMBOBOX_LABEL)?.[1]
  expect(defaultLabel).toContain("text-label-md")
  expect(defaultLabel).toBe(mediumLabel)
})

it.each([
  { disabled: false, readOnly: false, clearable: true, hasClear: true },
  { disabled: true, readOnly: false, clearable: true, hasClear: false },
  { disabled: false, readOnly: true, clearable: true, hasClear: false },
  { disabled: false, readOnly: false, clearable: false, hasClear: false },
])(
  "only exposes an editable selection's clear action: %j",
  ({ hasClear, ...state }) => {
    const html = renderToStaticMarkup(
      h(Combobox, {
        items: [{ label: "USA", value: "us" }],
        defaultValue: "us",
        ...state,
      })
    )
    expect(html.includes('data-part="clear-trigger"')).toBe(hasClear)
    expect(html.match(COMBOBOX_INPUT)?.[0]).toContain('value="USA"')
  }
)

it.each(["sm", "md", "lg"] as const)(
  "truncates long %s input text without changing its accessible value",
  (size) => {
    const value = "A deliberately long selected catalogue entry"
    const placeholder = "Search products and categories"
    const html = renderToStaticMarkup(
      h(Combobox, {
        items: [],
        label: "Catalogue",
        defaultInputValue: value,
        placeholder,
        size,
      })
    )
    const input = html.match(COMBOBOX_INPUT)?.[0]
    expect(input).toContain("truncate")
    expect(input).toContain(`value="${value}"`)
    expect(input).toContain(`placeholder="${placeholder}"`)
  }
)
