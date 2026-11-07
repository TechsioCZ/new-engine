import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Dialog } from "../src/molecules/dialog"

const fixedHeading = /<h2[^>]*class="[^"]*shrink-0/
const independentFooter =
  /dialog-scroll-viewport[^>]*>[\s\S]*Review product 24<\/p><\/div><div[^>]*>.*Publish changes/

const renderDialog = (props: Parameters<typeof Dialog>[0]) =>
  renderToStaticMarkup(h(Dialog, { open: true, portal: false, ...props }))

describe("Dialog scroll boundaries", () => {
  it("keeps its heading and footer outside the independently scrolling body", () => {
    const html = renderDialog({
      title: "Review catalog",
      description: "Review all products before publishing.",
      children: h("p", null, "Review product 24"),
      actions: h("button", { type: "button" }, "Publish changes"),
    })
    const headingEnd = html.indexOf("</h2>")
    const viewportStart = html.indexOf("dialog-scroll-viewport")
    expect(headingEnd).toBeGreaterThan(0)
    expect(viewportStart).toBeGreaterThan(headingEnd)
    expect(html).toMatch(fixedHeading)
    expect(html).toMatch(independentFooter)
    expect(html).toContain("aria-labelledby=")
    expect(html).toContain("aria-describedby=")
    expect(html).toContain("dialog-scroll-viewport flex min-h-0")
  })

  it("does not add an empty body or an extra content gap to title-only dialogs", () => {
    const html = renderDialog({ title: "Confirmation" })
    expect(html).toContain("Confirmation</h2>")
    expect(html).not.toContain("dialog-scroll-viewport")
    expect(html).toContain('aria-label="Close dialog"')
  })

  it("retains the body and its full inline width without a title", () => {
    const html = renderDialog({
      "aria-label": "Review catalog",
      description: "Review every delivery detail.",
      children: h("p", null, "Product details"),
    })
    expect(html).toContain("dialog-scroll-viewport")
    expect(html).not.toContain("pe-dialog-title-safe")
    expect(html).toContain("Review every delivery detail.")
    expect(html).toContain("Product details")
  })
})
