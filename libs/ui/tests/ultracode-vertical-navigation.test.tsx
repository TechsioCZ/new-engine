import {
  type CSSProperties,
  createElement as h,
  type ReactElement,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { VerticalNavigation } from "../src/molecules/vertical-navigation"
import { AccordionTemplate } from "../src/templates/accordion"

const accordionContentPattern = /<div\b[^>]*data-part="item-content"[^>]*>/
const accordionTriggerPattern = /<button\b[^>]*data-part="item-trigger"[^>]*>/
const branchContentPattern = /<div\b[^>]*data-part="branch-content"[^>]*>/g
const hiddenAttributePattern = /\bhidden(?:="")?/

const items = [
  {
    value: "returns",
    title: "What is your return policy?",
    content: h("p", null, "Unused items can be returned within 30 days."),
  },
  {
    value: "collection",
    title: "Warehouse collection (unavailable during maintenance)",
    content: "Collection will resume when warehouse maintenance is complete.",
    disabled: true,
  },
]

describe("AccordionTemplate answer alignment", () => {
  it.each(["sm", "md", "lg"] as const)(
    "aligns %s answers with question text without changing panel block spacing",
    (size) => {
      const html = renderToStaticMarkup(
        h(AccordionTemplate, {
          items,
          size,
          defaultValue: ["returns"],
        })
      )
      const content = html.match(accordionContentPattern)?.[0]
      const trigger = html.match(accordionTriggerPattern)?.[0]

      expect(content).toBeDefined()
      expect(content).toContain(`px-(--padding-accordion-title-x-${size})`)
      expect(content).toContain(`p-accordion-panel-${size}`)
      expect(trigger).toContain(`p-accordion-title-${size}`)
      expect(content).toContain('data-state="expanded"')
      expect(html).toContain(
        "<p>Unused items can be returned within 30 days.</p>"
      )
      const disabledItem = items[1]
      if (!disabledItem) {
        throw new Error("Missing disabled AccordionTemplate item fixture")
      }
      expect(html).toContain(disabledItem.title)
      expect(html).toContain('data-disabled="true"')
    }
  )

  it("preserves RTL, caller styling, heading depth and disclosure semantics", () => {
    const html = renderToStaticMarkup(
      h(AccordionTemplate, {
        items,
        dir: "rtl",
        headingLevel: 2,
        className: "caller-accordion",
        style: {
          "--padding-accordion-title-x-md": "2rem",
        } as CSSProperties,
        defaultValue: ["returns"],
        "aria-label": "Delivery and returns",
      })
    )

    expect(html).toContain('dir="rtl"')
    expect(html).toContain("caller-accordion")
    expect(html).toContain("--padding-accordion-title-x-md:2rem")
    expect(html).toContain('aria-level="2"')
    expect(html).toContain('aria-label="Delivery and returns"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain("aria-controls=")
    expect(html).toContain("aria-labelledby=")
    expect(html).toContain("px-(--padding-accordion-title-x-md)")
  })
})

describe("VerticalNavigation hierarchy preservation", () => {
  it("caps visual indentation without flattening deep RTL navigation", () => {
    let child: ReactElement = h(
      VerticalNavigation.Item,
      null,
      h(
        VerticalNavigation.Link,
        { current: true, href: "/leaf" },
        "Current leaf"
      )
    )

    for (let depth = 5; depth > 0; depth -= 1) {
      child = h(
        VerticalNavigation.Branch,
        { defaultOpen: true, containsCurrent: true },
        h(VerticalNavigation.BranchTrigger, null, `Level ${depth}`),
        h(
          VerticalNavigation.BranchContent,
          { showGuide: true, tone: "subtle" },
          h(VerticalNavigation.List, null, child)
        )
      )
    }

    const html = renderToStaticMarkup(
      h(
        VerticalNavigation,
        { dir: "rtl", maxIndentDepth: 3, "aria-label": "Deep catalog" },
        h(VerticalNavigation.List, null, child)
      )
    )
    const panels = html.match(branchContentPattern) ?? []

    expect(html).toContain('dir="rtl"')
    expect(html.match(/<ul\b/g)).toHaveLength(6)
    expect(panels).toHaveLength(5)
    expect(
      panels.filter((panel) => panel.includes('data-indented="true"'))
    ).toHaveLength(3)
    expect(panels.every((panel) => panel.includes('data-guide="true"'))).toBe(
      true
    )
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toContain('href="/leaf"')
    expect(html).not.toContain('role="tree"')
    expect(html).not.toContain('role="menu"')
  })

  it("keeps a controlled collapsed branch visible and distinct from its destination", () => {
    const html = renderToStaticMarkup(
      h(
        VerticalNavigation,
        { "aria-label": "Controlled categories" },
        h(
          VerticalNavigation.List,
          null,
          h(
            VerticalNavigation.Branch,
            { open: false, containsCurrent: true },
            h(
              VerticalNavigation.BranchTrigger,
              {
                "aria-label": "Toggle controlled branch",
                className: "caller-trigger",
              },
              "Controlled branch",
              h(VerticalNavigation.BranchIndicator)
            ),
            h(
              VerticalNavigation.BranchContent,
              null,
              h(
                VerticalNavigation.List,
                null,
                h(
                  VerticalNavigation.Item,
                  null,
                  h(
                    VerticalNavigation.Link,
                    { current: true, href: "#controlled-child" },
                    "Controlled destination"
                  )
                )
              )
            )
          )
        )
      )
    )

    expect(html).toContain("Controlled branch")
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain("caller-trigger")
    expect(html).toContain("focus-visible:vertical-navigation-focus")
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('href="#controlled-child"')
    expect(html.match(branchContentPattern)?.[0]).toMatch(
      hiddenAttributePattern
    )
  })
})
