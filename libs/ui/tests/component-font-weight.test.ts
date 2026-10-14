import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Button } from "../src/atoms/button"
import { Input } from "../src/atoms/input"
import { LinkButton } from "../src/atoms/link-button"

const CLASS_ATTRIBUTE = /class="([^"]*)"/

describe("component font-weight class merging", () => {
  it.each(["font-normal", "font-medium", "font-semibold", "font-bold"])(
    "preserves the explicit %s override on Button and LinkButton",
    (className) => {
      for (const html of [
        renderToStaticMarkup(h(Button, { className }, "Save")),
        renderToStaticMarkup(
          h(LinkButton, { className, href: "/orders" }, "Orders")
        ),
      ]) {
        const classes = html.match(CLASS_ATTRIBUTE)?.[1]?.split(" ")
        expect(classes).toContain(className)
        expect(classes).not.toContain("font-button")
      }
    }
  )

  it("merges input and placeholder weights independently, retaining font family", () => {
    const html = renderToStaticMarkup(
      h(Input, { className: "font-sans font-bold placeholder:font-medium" })
    )
    const classes = html.match(CLASS_ATTRIBUTE)?.[1]?.split(" ")
    expect(classes).toContain("font-bold")
    expect(classes).toContain("placeholder:font-medium")
    expect(classes).toContain("font-sans")
    expect(classes).not.toContain("font-input")
    expect(classes).not.toContain("placeholder:font-input-placeholder")
  })
})
