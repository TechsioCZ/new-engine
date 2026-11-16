import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Button } from "../src/atoms/button"
import { Input } from "../src/atoms/input"
import { LinkButton } from "../src/atoms/link-button"
import { Pagination } from "../src/molecules/pagination"
import { Tabs } from "../src/molecules/tabs"
import { VerticalNavigation } from "../src/molecules/vertical-navigation"

const CLASS_ATTRIBUTE = /class="([^"]*)"/
const BUTTON_ONLY_ACTIVE = /active:scale-|active:bg-button|active:text-button/
const CURRENT_PATH_TRIGGER = /<button[^>]*data-current-path="true"/

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

describe("navigation owns composed Button visuals", () => {
  const samples = [
    {
      name: "Tabs.Trigger",
      html: () =>
        renderToStaticMarkup(
          h(
            Tabs,
            { defaultValue: "overview" },
            h(
              Tabs.List,
              { "aria-label": "Views" },
              h(
                Tabs.Trigger,
                { value: "overview", composition: false },
                "Overview"
              )
            ),
            h(Tabs.Content, { value: "overview" }, "Summary")
          )
        ),
      weight: "font-tabs-trigger",
      press: "tabs-trigger-press",
    },
    {
      name: "Pagination",
      html: () =>
        renderToStaticMarkup(
          h(Pagination, {
            count: 30,
            page: 2,
            getPageUrl: ({ page }) => `#page-${page}`,
            linkProps: { composition: false },
          })
        ),
      weight: "font-pagination",
      press: "pagination-press",
    },
    {
      name: "VerticalNavigation.Link and BranchTrigger",
      html: () =>
        renderToStaticMarkup(
          h(
            VerticalNavigation,
            null,
            h(
              VerticalNavigation.List,
              null,
              h(
                VerticalNavigation.Branch,
                { containsCurrent: true, defaultOpen: true },
                h(
                  VerticalNavigation.Row,
                  null,
                  h(
                    VerticalNavigation.Link,
                    { href: "#catalog", current: true, composition: false },
                    "Catalog"
                  ),
                  h(
                    VerticalNavigation.BranchTrigger,
                    { composition: false },
                    "Expand"
                  )
                )
              )
            )
          )
        ),
      weight: "font-vertical-navigation",
      press: "vertical-navigation-press",
    },
  ] as const

  it.each(samples)(
    "$name cannot restore Button weight or motion through caller props",
    ({ html, weight, press }) => {
      const markup = html()
      const controls = [
        ...markup.matchAll(/<(?:a|button)\b[^>]*class="([^"]*)"[^>]*>/g),
      ]
      expect(controls.length).toBeGreaterThan(0)
      for (const [, className] of controls) {
        if (!className) {
          throw new Error("Navigation control has no classes")
        }
        const classes = className.split(" ")
        expect(classes).toContain(weight)
        expect(classes).toContain(press)
        expect(classes).not.toContain("font-button")
        expect(className).not.toMatch(BUTTON_ONLY_ACTIVE)
      }
      expect(markup).not.toContain("composition=")
    }
  )

  it("preserves selected, current-path and label emphasis separately", () => {
    expect(samples[0].html()).toContain(
      "data-selected:font-tabs-trigger-selected"
    )
    expect(samples[1].html()).toContain("data-selected:font-pagination-current")
    const markup = samples[2].html()
    expect(markup).toContain("data-current:font-vertical-navigation-current")
    expect(markup).toContain("data-current-path:font-vertical-navigation-path")
    expect(markup).toContain('aria-current="page"')
    expect(markup).toMatch(CURRENT_PATH_TRIGGER)
    const label = renderToStaticMarkup(
      h(
        VerticalNavigation,
        null,
        h(VerticalNavigation.GroupLabel, null, "Catalog")
      )
    )
    expect(label).toContain("font-vertical-navigation-label")
  })
})
