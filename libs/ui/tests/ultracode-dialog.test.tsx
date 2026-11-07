import { readFileSync } from "node:fs"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Dialog, type DialogProps } from "../src/molecules/dialog"

const contentTag = /<div\b[^>]*data-part="content"[^>]*>/
const titleTag = /<h2\b[^>]*>/
const descriptionTag = /<div\b[^>]*data-part="description"[^>]*>/
const bodyTag = /<div\b[^>]*class="dialog-scroll-viewport[^>]*>/
const classAttribute = /\bclass="([^"]*)"/
const idAttribute = /\bid="([^"]*)"/
const whitespace = /\s+/

const renderDialog = (props: DialogProps = {}) =>
  renderToStaticMarkup(h(Dialog, { open: true, portal: false, ...props }))

const classes = (tag: string | undefined) => {
  if (!tag) {
    throw new Error("Missing Dialog element markup")
  }
  const className = tag.match(classAttribute)?.[1]
  if (className === undefined) {
    throw new Error("Missing class attribute on Dialog element")
  }
  return className.split(whitespace)
}

const css = readFileSync(
  new URL("../src/tokens/components/molecules/_dialog.css", import.meta.url),
  "utf8"
)

describe("Dialog remaining layout regressions", () => {
  it("reserves close-button space only on the heading, not the body copy", () => {
    const html = renderDialog({
      title: "Delete the Northstar account?",
      description: "All projects and saved files will be permanently removed.",
    })
    const panel = html.match(contentTag)?.[0]
    const heading = html.match(titleTag)?.[0]
    const description = html.match(descriptionTag)?.[0]
    expect(classes(heading)).toContain("pe-dialog-title-safe")
    expect(classes(description)).not.toContain("pe-dialog-title-safe")
    expect(classes(html.match(bodyTag)?.[0])).toContain("min-w-0")
    expect(panel).toContain(
      `aria-labelledby="${heading?.match(idAttribute)?.[1]}"`
    )
    expect(panel).toContain(
      `aria-describedby="${description?.match(idAttribute)?.[1]}"`
    )
  })

  it("does not keep an empty heading gutter when the close action is hidden", () => {
    const html = renderDialog({
      title: "Full-width heading without a close action",
      description: "Use the footer to finish this task.",
      hideCloseButton: true,
      actions: h("button", { type: "button" }, "Done"),
    })
    expect(html).not.toContain("pe-dialog-title-safe")
    expect(html).not.toContain("pt-dialog-content-close-safe")
    expect(html).not.toContain('aria-label="Close dialog"')
    expect(html).toContain(">Done</button>")
  })

  it("moves untitled content below the close action without narrowing its inline measure", () => {
    const html = renderDialog({
      "aria-label": "Delivery instructions",
      description: "Deliveries arrive at reception between 09:00 and 17:00.",
    })
    expect(classes(html.match(contentTag)?.[0])).toContain(
      "pt-dialog-content-close-safe"
    )
    expect(html).not.toContain("pe-dialog-title-safe")
    expect(html).toContain('aria-label="Delivery instructions"')
    expect(html).toContain("Deliveries arrive at reception")

    const withoutClose = renderDialog({
      "aria-label": "Delivery instructions",
      description: "Use the footer to dismiss.",
      hideCloseButton: true,
    })
    expect(withoutClose).not.toContain("pt-dialog-content-close-safe")
  })

  it("derives heading clearance from the real close target and content inset", () => {
    expect(css).toContain(
      "--size-dialog-close-target: var(--size-icon-control-md);"
    )
    const clearance = css.slice(
      css.indexOf("--spacing-dialog-close-clearance: max("),
      css.indexOf("--padding-dialog-content-close-safe:")
    )
    expect(clearance).toContain("var(--spacing-dialog-close-trigger-offset)")
    expect(clearance).toContain("var(--size-dialog-close-target)")
    expect(clearance).toContain("var(--spacing-dialog-close-gap) -")
    expect(clearance).toContain("var(--padding-dialog-content)")
    expect(clearance).not.toContain("--spacing-500")
  })

  it.each(["left", "right", "top", "bottom"] as const)(
    "bounds the %s placement without clipping nested popup portals to the panel",
    (placement) => {
      const html = renderDialog({
        placement,
        size: "lg",
        title: "Review catalog",
        description: "Review each delivery detail.",
      })
      const panelClasses = classes(html.match(contentTag)?.[0])
      expect(panelClasses.filter((name) => name.startsWith("max-h-"))).toEqual([
        "max-h-full",
      ])
      expect(panelClasses).toContain("min-h-0")
      expect(panelClasses).toContain("max-w-full")
      expect(panelClasses).toContain("dialog-content-layout")
      expect(panelClasses).not.toContain("overflow-y-auto")
      expect(panelClasses).not.toContain("overflow-hidden")
      expect(panelClasses).not.toContain("overflow-clip")
      expect(panelClasses).toContain(
        placement === "left" || placement === "right"
          ? "w-dialog-lg"
          : "h-dialog-lg"
      )
    }
  )

  it.each(["xs", "sm", "md", "lg", "xl", "full"] as const)(
    "gives the centered %s panel one viewport cap and safe alignment",
    (size) => {
      const html = renderDialog({ size, title: "Review catalog" })
      const panelClasses = classes(html.match(contentTag)?.[0])
      expect(panelClasses.filter((name) => name.startsWith("max-h-"))).toEqual([
        "max-h-dialog-center-h-max",
      ])
      expect(panelClasses).toContain("my-auto")
      expect(panelClasses).toContain("dialog-content-layout")
      expect(html).toContain("items-start")
    }
  )

  it("retains the centered viewport budget and bottom drawer's safe alignment", () => {
    const heightBudget = css.slice(
      css.indexOf("--height-dialog-center-h-max: min("),
      css.indexOf("--container-dialog-center-w-max:")
    )
    expect(heightBudget).toContain("80svh")
    expect(heightBudget).toContain(
      "calc(100svh - var(--spacing-dialog-viewport-gutter) * 2)"
    )
    const bottom = renderDialog({
      placement: "bottom",
      title: "Review catalog",
    })
    expect(classes(bottom.match(contentTag)?.[0])).toContain("mt-auto")
    expect(bottom).toContain("items-start")
  })

  it("uses native outer scrolling in short viewports while retaining focus clearance", () => {
    const positioner = css.slice(
      css.indexOf("@utility dialog-positioner-layer"),
      css.indexOf("@utility dialog-content-layout")
    )
    expect(positioner).toContain("overflow-y: auto;")
    const panel = css.slice(css.indexOf("@utility dialog-content-layout"))
    expect(panel).toContain("@media (max-height: 30rem)")
    expect(panel).toContain('&[data-scope="dialog"][data-part="content"]')
    expect(panel).toContain("height: max-content;")
    expect(panel).toContain("max-height: none;")
    const body = css.slice(
      css.indexOf("@utility dialog-scroll-viewport"),
      css.indexOf("/* Semantic tokens for dialog icons */")
    )
    expect(body).toContain("@media (max-height: 30rem)")
    expect(body).toContain("flex-shrink: 0;")
    expect(body).toContain("margin: calc(var(--dialog-focus-clearance) * -1);")
    expect(body).toContain("padding: var(--dialog-focus-clearance);")
  })

  it("retains all review content and independently reachable footer actions", () => {
    const html = renderDialog({
      title: "Review catalog",
      children: Array.from({ length: 24 }, (_, index) =>
        h("p", { key: index }, `Review product ${index + 1}`)
      ),
      actions: h("button", { type: "button" }, "Publish changes"),
    })
    for (let index = 1; index <= 24; index += 1) {
      expect(html).toContain(`>Review product ${index}</p>`)
    }
    expect(html.indexOf("</h2>")).toBeLessThan(
      html.indexOf("dialog-scroll-viewport")
    )
    expect(html).toContain("Review product 24</p></div><div")
    expect(html.indexOf("Review product 24")).toBeLessThan(
      html.indexOf("Publish changes")
    )
  })

  it("preserves modeless pointer behavior and the accessible close control", () => {
    const html = renderDialog({
      behavior: "modeless",
      title: "Recent activity",
      description: "Background controls remain available.",
    })
    expect(html).toContain('aria-modal="false"')
    expect(html).toContain("pointer-events-none")
    expect(html).toContain("pointer-events-auto")
    expect(html).not.toContain('data-part="backdrop"')
    expect(html).toContain('aria-label="Close dialog"')
    expect(
      renderDialog({ open: false, triggerText: "Open activity window" })
    ).not.toContain('role="dialog"')
  })
})
