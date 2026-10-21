import { readFileSync } from "node:fs"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Breadcrumb } from "../src/molecules/breadcrumb"
import { Pagination, paginationVariants } from "../src/molecules/pagination"
import { Steps, useSteps } from "../src/molecules/steps"
import { type TreeNode, TreeView } from "../src/molecules/tree-view"
import { AccordionTemplate } from "../src/templates/accordion"
import { BreadcrumbTemplate } from "../src/templates/breadcrumb"
import { TabsTemplate } from "../src/templates/tabs"

const href = ({ page }: { page: number }) => `#page-${page}`
const classAttribute = /class="([^"]*)"/
const rootTag = /<div\b[^>]*>/

function Store({ step, count }: { step: number; count: number }) {
  const api = useSteps({ step, count })
  return h(Steps.RootProvider, { value: api }, h(Steps.Progress))
}

describe("bounded navigation state", () => {
  it.each([-20, 500, Number.NaN])(
    "renders a safe controlled step %s through both roots",
    (step) => {
      const direct = renderToStaticMarkup(
        h(Steps, { step, count: 3 }, h(Steps.Progress))
      )
      const store = renderToStaticMarkup(h(Store, { step, count: 3 }))
      for (const html of [direct, store]) {
        const percent = Number(html.match(/aria-valuenow="([^"]*)"/)?.[1])
        expect(Number.isFinite(percent)).toBe(true)
        expect(percent).toBeGreaterThanOrEqual(0)
        expect(percent).toBeLessThanOrEqual(100)
        expect(html).not.toContain("NaN")
      }
    }
  )
  it("defines zero-step progress and completion semantics", () => {
    const html = renderToStaticMarkup(
      h(
        Steps,
        { count: 0 },
        h(Steps.Progress),
        h(Steps.CompletedContent, null, "Ready")
      )
    )
    expect(html).toContain('aria-valuenow="100"')
    expect(html).toContain("<section")
    expect(html).toContain('aria-label="Workflow complete"')
    expect(html).not.toContain('role="tabpanel"')
    expect(html).not.toContain("trigger:0")
  })
  it("forwards machine ids without leaking validation props onto the DOM", () => {
    const html = renderToStaticMarkup(
      h(Steps, {
        count: 3,
        ids: { root: "custom-root" },
        isStepValid: () => false,
        isStepSkippable: () => true,
        onStepInvalid: () => {},
      })
    )
    expect(html).toContain('id="custom-root"')
    expect(html).not.toMatch(
      /(?:isStepValid|isStepSkippable|onStepInvalid|ids)=/
    )
  })
  it("uses an ordered list and real disabled headers for linear flows", () => {
    const html = renderToStaticMarkup(
      h(
        Steps,
        { count: 1, linear: true },
        h(
          Steps.List,
          null,
          h(Steps.Item, { index: 0 }, h(Steps.Trigger, null, "Brief"))
        )
      )
    )
    expect(html).toContain("<ol")
    expect(html).toContain("<li")
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-current="step"')
    expect(html).not.toMatch(
      /role="tab(?:list)?"|aria-selected|aria-owns|aria-orientation/
    )
  })
  it("renders no navigable destinations for zero results", () => {
    const html = renderToStaticMarkup(
      h(Pagination, { count: 0, compact: true, getPageUrl: href })
    )
    expect(html).toContain("0 of 0")
    expect(html).not.toContain("href=")
    expect(html).not.toContain("<a ")
  })
  it("does not claim a clamped page when a controlled owner still displays invalid data", () => {
    const html = renderToStaticMarkup(
      h(Pagination, { count: 20, page: 10, getPageUrl: href })
    )
    expect(html).toContain("Page unavailable")
    expect(html).not.toContain("href=")
    expect(html).not.toContain('aria-current="page"')
  })
  it("gives minimal current pages a persistent non-color cue", () => {
    expect(paginationVariants({ variant: "minimal" }).link()).toContain(
      "data-selected:underline"
    )
  })
})

describe("shared template semantics and typography", () => {
  it("names a template tablist independently of its outer root", () => {
    const html = renderToStaticMarkup(
      h(TabsTemplate, {
        "aria-label": "Outer",
        tablistProps: { "aria-label": "Product views" },
        items: [{ value: "a", label: "Overview", content: "Specs" }],
      })
    )
    expect(html).toMatch(
      /role="tablist"[^>]*aria-label="Product views"|aria-label="Product views"[^>]*role="tablist"/
    )
    expect(html.match(rootTag)?.[0]).toContain('aria-label="Outer"')
  })
  it("applies template heading levels to item headings, not the root", () => {
    const html = renderToStaticMarkup(
      h(AccordionTemplate, {
        headingLevel: 2,
        items: [{ value: "a", title: "Delivery", content: "Two days" }],
      })
    )
    expect(html).toMatch(/<h3\b[^>]*aria-level="2"/)
    expect(html.match(rootTag)?.[0]).not.toContain("aria-level")
  })
  it("inherits breadcrumb typography by default while preserving explicit overrides", () => {
    const compound = renderToStaticMarkup(
      h(
        Breadcrumb,
        { size: "sm" },
        h(
          Breadcrumb.List,
          null,
          h(
            Breadcrumb.Item,
            null,
            // biome-ignore lint/correctness/noChildrenProp: The polymorphic Link type requires children in props for createElement.
            h(Breadcrumb.Link, { href: "#home", children: "Home" })
          )
        )
      )
    )
    expect(
      compound.match(/<a\b[^>]*>/)?.[0]?.match(classAttribute)?.[1]
    ).not.toContain("text-link-md")
    const template = renderToStaticMarkup(
      h(BreadcrumbTemplate, {
        items: [{ label: "Home", href: "#home" }, { label: "Current" }],
        linkProps: { size: "lg" },
      })
    )
    expect(template.match(/<a\b[^>]*>/)?.[0]).toContain("text-link-lg")
  })
  it("keeps complete documented tab examples inside a named list", () => {
    const skill = readFileSync(
      new URL("../skills/tabs-usage/SKILL.md", import.meta.url),
      "utf8"
    )
    const completeExamples = [
      ...skill.matchAll(/```tsx\n(<Tabs\s[\s\S]*?)\n```/g),
    ]
    expect(completeExamples.length).toBeGreaterThanOrEqual(2)
    for (const [, example] of completeExamples) {
      expect(example).toContain("<Tabs.List")
      expect(example).toContain("<Tabs.Content")
      expect(example).toContain("defaultValue=")
    }
  })
})

describe("tree selection eligibility", () => {
  const data: TreeNode[] = [
    { id: "branch", name: "Branch", children: [{ id: "leaf", name: "Leaf" }] },
    { id: "disabled", name: "Disabled", disabled: true },
    { id: "custom", name: "Custom", selectable: false },
  ]
  it.each(["all", "leaf-only", "custom"] as const)(
    "disables descendants consistently for %s selection and focus without mutating data",
    (selectionBehavior) => {
      const leaf: TreeNode = { id: "nested-leaf", name: "Nested leaf" }
      const nested: TreeNode = {
        id: "nested",
        name: "Nested",
        children: [leaf],
      }
      const disabledData: TreeNode[] = [
        {
          id: "unavailable",
          name: "Unavailable",
          disabled: true,
          children: [nested],
        },
        { id: "available", name: "Available" },
      ]
      for (const controlled of [false, true]) {
        const html = renderToStaticMarkup(
          h(
            TreeView,
            {
              data: disabledData,
              selectionBehavior,
              expandedValue: ["unavailable", "nested"],
              ...(controlled
                ? {
                    selectedValue: ["nested", "nested-leaf"],
                    focusedValue: "nested-leaf",
                  }
                : {
                    defaultSelectedValue: ["nested", "nested-leaf"],
                    defaultFocusedValue: "nested-leaf",
                  }),
            },
            h(
              TreeView.Tree,
              null,
              ...disabledData.map((node, index) =>
                h(TreeView.Node, { node, indexPath: [index], key: node.id })
              )
            )
          )
        )
        for (const id of ["nested", "nested-leaf"]) {
          const tags = [
            ...html.matchAll(
              new RegExp(
                `<div[^>]*data-part="(?:branch|branch-control|item)"[^>]*data-value="${id}"[^>]*>`,
                "g"
              )
            ),
          ]
          expect(tags.length).toBeGreaterThan(0)
          for (const [tag] of tags) {
            expect(tag).toContain('data-disabled=""')
            expect(tag).not.toContain('data-selected=""')
            expect(tag).not.toContain('tabindex="0"')
          }
        }
        expect(
          html.match(/<div[^>]*data-value="available"[^>]*>/)?.[0]
        ).toContain('tabindex="0"')
      }
      expect(leaf.disabled).toBeUndefined()
      expect(nested.disabled).toBeUndefined()
    }
  )
  it.each(["leaf-only", "custom"] as const)(
    "filters controlled and default %s selections before machine state",
    (selectionBehavior) => {
      for (const controlled of [false, true]) {
        const props = {
          data,
          selectionBehavior,
          ...(controlled
            ? { selectedValue: ["branch", "leaf", "disabled", "custom"] }
            : {
                defaultSelectedValue: ["branch", "leaf", "disabled", "custom"],
              }),
        }
        const html = renderToStaticMarkup(
          h(
            TreeView,
            props,
            h(
              TreeView.Tree,
              null,
              ...data.map((node, index) =>
                h(TreeView.Node, { node, indexPath: [index], key: node.id })
              )
            )
          )
        )
        const disabledTag = html.match(
          /<div[^>]*data-value="disabled"[^>]*>/
        )?.[0]
        expect(disabledTag).not.toContain('data-selected=""')
        expect(disabledTag).toContain('tabindex="-1"')
        if (selectionBehavior === "custom") {
          expect(
            html.match(/<div[^>]*data-value="custom"[^>]*>/)?.[0]
          ).not.toContain('data-selected=""')
        } else {
          expect(
            html.match(/<div[^>]*data-part="branch-control"[^>]*>/)?.[0]
          ).not.toContain('data-selected=""')
        }
      }
    }
  )
})
