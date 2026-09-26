import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { VerticalNavigation } from "../../src/molecules/vertical-navigation"

describe("VerticalNavigation server rendering", () => {
  it("renders native navigation and a current-page link, not an ARIA menu", () => {
    const html = renderToStaticMarkup(
      h(
        VerticalNavigation,
        { "aria-label": "Categories" },
        h(
          VerticalNavigation.List,
          null,
          h(
            VerticalNavigation.Item,
            null,
            h(
              VerticalNavigation.Link,
              { href: "/screws", current: true },
              "Screws"
            )
          )
        )
      )
    )
    expect(html).toContain("<nav")
    expect(html).toContain('aria-label="Categories"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('href="/screws"')
    expect(html).not.toContain('role="menu"')
    expect(html).not.toContain('role="tree"')
  })

  it.each([
    "primary",
    "secondary",
  ] as const)("keeps %s group colors separate from navigation state", (variant) => {
    const html = renderToStaticMarkup(
      h(
        VerticalNavigation,
        { "aria-label": "Categories" },
        h(
          VerticalNavigation.List,
          null,
          h(
            VerticalNavigation.Branch,
            { defaultOpen: true },
            h(
              VerticalNavigation.Row,
              null,
              h(VerticalNavigation.Link, { href: "/screws" }, "Screws"),
              h(
                VerticalNavigation.BranchTrigger,
                { "aria-label": "Toggle screws" },
                "+"
              )
            ),
            h(
              VerticalNavigation.BranchContent,
              { tone: "accent", variant },
              h(
                VerticalNavigation.List,
                null,
                h(
                  VerticalNavigation.Item,
                  null,
                  h(
                    VerticalNavigation.Link,
                    { href: "/screws/din933" },
                    "DIN 933"
                  )
                )
              )
            )
          )
        )
      )
    )
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain("aria-controls=")
    expect(html).toContain('data-tone="accent"')
    expect(html).toContain(`data-variant="${variant}"`)
    expect(html).toContain(
      `bg-vertical-navigation-group-bg-${variant === "primary" ? "accent" : "secondary"}`
    )
    expect(html).not.toContain('aria-current="page"')
    expect(html).toMatch(/<a[^>]*>Screws<\/a><button/)
  })

  it("keeps plain groups neutral even when a brand variant is specified", () => {
    const html = renderToStaticMarkup(
      h(
        VerticalNavigation,
        null,
        h(VerticalNavigation.Group, { variant: "secondary" }, "Categories")
      )
    )
    expect(html).toContain("bg-vertical-navigation-group-bg-plain")
    expect(html).not.toContain("bg-vertical-navigation-group-bg-secondary")
  })

  it("supports seven nested lists without depending on a Sidebar provider", () => {
    let child = h(
      VerticalNavigation.Item,
      null,
      h(
        VerticalNavigation.Link,
        { href: "/leaf", current: true },
        "Current leaf"
      )
    )
    for (let depth = 6; depth > 0; depth -= 1) {
      child = h(
        VerticalNavigation.Branch,
        { defaultOpen: true },
        h(VerticalNavigation.BranchTrigger, null, `Level ${depth}`),
        h(
          VerticalNavigation.BranchContent,
          null,
          h(VerticalNavigation.List, null, child)
        )
      )
    }
    const html = renderToStaticMarkup(
      h(
        VerticalNavigation,
        { "aria-label": "Deep categories" },
        h(VerticalNavigation.List, null, child)
      )
    )
    expect(html.match(/<ul\b/g)).toHaveLength(7)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it("reports missing root and branch contexts clearly", () => {
    expect(() =>
      renderToStaticMarkup(h(VerticalNavigation.Link, { href: "/" }, "Home"))
    ).toThrow("VerticalNavigation.Root")
    expect(() =>
      renderToStaticMarkup(
        h(
          VerticalNavigation,
          null,
          h(VerticalNavigation.BranchTrigger, null, "Open")
        )
      )
    ).toThrow("VerticalNavigation.Branch")
  })
})
