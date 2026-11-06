import { type ComponentType, createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CustomLayoutHorizontal } from "../stories/atoms/numeric-input.stories"
import { AggregateDisplay } from "../stories/atoms/rating.stories"
import { DescriptionLifecycle } from "../stories/atoms/status-text.stories"
import { CustomContent } from "../stories/molecules/accordion.stories"

const shippedBadge = /<span\b[^>]*class="([^"]+)"[^>]*>Shipped<\/span>/
const invalidInput = /<input\b[^>]*aria-invalid="true"[^>]*>/
const classAttribute = /\bclass="([^"]+)"/
const whitespace = /\s+/
const buttonTag = /<button\b[^>]*>/g
const formTag = /<form\b[^>]*>/

describe("council composition corrections", () => {
  it("uses one radius and border language for the horizontal numeric editor", () => {
    const Example = CustomLayoutHorizontal.render as ComponentType
    const html = renderToStaticMarkup(h(Example))
    const controls = [...html.matchAll(buttonTag)].map((match) => match[0])
    expect(controls).toHaveLength(2)
    for (const control of controls) {
      const classes = control.match(classAttribute)?.[1]?.split(whitespace)
      expect(classes).toContain("rounded-numeric-input-md")
      expect(classes).toContain("border-(length:--border-width-form-control)")
      expect(classes).toContain("border-numeric-input-border")
      expect(classes).toContain("hover:border-numeric-input-border-hover")
    }
    expect(html).toContain('value="50"')
  })

  it("separates aggregate rating boundaries without adding a tab stop", () => {
    const Example = AggregateDisplay.render as ComponentType
    const html = renderToStaticMarkup(h(Example))
    const classes = html
      .match(formTag)?.[0]
      ?.match(classAttribute)?.[1]
      ?.split(whitespace)
    expect(classes).toEqual(
      expect.arrayContaining(["flex", "flex-col", "items-start", "gap-150"])
    )
    expect(html).toContain("Average product rating")
    expect(html).toContain("Before summary")
    expect(html).toContain("After summary")
    expect(html).not.toContain('tabindex="0"')
    expect(html).not.toContain("<input")
  })

  it("keeps the short order status nonshrinking without removing its content", () => {
    const Example = CustomContent.render as ComponentType
    const html = renderToStaticMarkup(h(Example))
    const badge = html.match(shippedBadge)
    expect(badge).not.toBeNull()
    expect(badge?.[1]?.split(whitespace)).toEqual(
      expect.arrayContaining(["shrink-0", "whitespace-nowrap"])
    )
    expect(html).toContain("Order TS-2048")
    expect(html).toContain("Alpine daypack · shipped today")
    expect(html).toContain("Show tracking details")
    expect(html).toContain('aria-expanded="true"')
  })

  it("paints the lifecycle field invalid while preserving associated feedback", () => {
    const Example = DescriptionLifecycle.render as ComponentType
    const html = renderToStaticMarkup(h(Example))
    const input = html.match(invalidInput)?.[0]
    expect(input).toBeDefined()
    const classes = input?.match(classAttribute)?.[1]?.split(whitespace)
    expect(classes).toContain("border-input-border-danger-base")
    expect(input).toContain("aria-errormessage=")
    expect(input).toContain('value="mara@"')
    expect(html).toContain("Billing contact.")
    expect(html).toContain("We only send order updates.")
    expect(html).toContain("Enter a valid email address.")
    expect(html).toContain("Clear validation")
  })
})
