import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { Combobox } from "../src/molecules/combobox"

const COMBOBOX_INPUT = /<input\b[^>]*role="combobox"[^>]*>/

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
