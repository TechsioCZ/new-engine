import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"
import { describe, expect, it } from "vitest"
import { Accordion } from "../src/molecules/accordion"
import { Breadcrumb } from "../src/molecules/breadcrumb"
import { Pagination, paginationVariants } from "../src/molecules/pagination"
import { Steps, useSteps } from "../src/molecules/steps"
import { type TreeNode, TreeView } from "../src/molecules/tree-view"
import { Footer } from "../src/organisms/footer"
import { AccordionTemplate } from "../src/templates/accordion"
import { BreadcrumbTemplate } from "../src/templates/breadcrumb"
import { FacetFilterPanel } from "../src/templates/facet-filter-panel"
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
    expect(html).toContain('role="group"')
    expect(html).not.toContain("<section")
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

describe("landmark naming and nested groups", () => {
  it("lets accordion panels have a distinguishing name or a non-landmark group role", () => {
    const html = renderToStaticMarkup(
      h(
        Accordion,
        { defaultValue: ["delivery"] },
        h(
          Accordion.Item,
          { value: "delivery" },
          h(Accordion.Header, null, "Delivery"),
          h(
            Accordion.Content,
            { "aria-label": "Small FAQ: Delivery", role: "group" },
            "Two business days"
          )
        )
      )
    )
    const panel = html.match(/<div\b[^>]*data-part="item-content"[^>]*>/)?.[0]
    expect(panel).toContain('aria-label="Small FAQ: Delivery"')
    expect(panel).toContain('role="group"')
    expect(panel).not.toContain("aria-labelledby=")
  })
  it("keeps indexed step content a labelled group rather than a page landmark", () => {
    const html = renderToStaticMarkup(
      h(
        Steps,
        { count: 1 },
        h(Steps.Content, { index: 0 }, "Enter the order details")
      )
    )
    expect(html).toContain('role="group"')
    expect(html).toContain("aria-labelledby=")
    expect(html).not.toContain("<section")
  })
  it("keeps footer subsections grouped inside the named footer landmark", () => {
    const html = renderToStaticMarkup(
      h(
        Footer,
        // biome-ignore lint/correctness/noChildrenProp: createElement requires the public component's children prop in its props type.
        { "aria-label": "Store information", children: null },
        h(
          Footer.Section,
          // biome-ignore lint/correctness/noChildrenProp: createElement requires the public component's children prop in its props type.
          { "aria-label": "Contact", children: null },
          "Contact details"
        )
      )
    )
    expect(html).toContain("<footer")
    expect(html).toContain('aria-label="Store information"')
    expect(html).toContain('role="group"')
    expect(html).not.toContain("<section")
  })
  it("names the keyboard-scrollable filter landmark even when every control is disabled", () => {
    const html = renderToStaticMarkup(
      h(FacetFilterPanel, {
        title: "Filters",
        "aria-label": "Small product filters",
        groups: [],
        disabled: true,
      })
    )
    const root = html.match(/<aside\b[^>]*>/)?.[0]
    expect(root).toContain('aria-label="Small product filters"')
    expect(root).toContain('tabindex="0"')
    expect(root).not.toContain("aria-labelledby=")
    expect(html).not.toContain("<section")
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

const copiedSourcePattern =
  /const playgroundSource = `([\s\S]*?)`\n\nconst meta/
const sourceEscapePattern = /\\([`$])/g

describe("navigation Docs sources", () => {
  const components = ["tabs", "pagination", "vertical-navigation"]
  const stories = components.map((component) =>
    readFileSync(
      new URL(`../stories/molecules/${component}.stories.tsx`, import.meta.url),
      "utf8"
    )
  )

  it("provides complete primary examples without private story wrappers", () => {
    for (let index = 0; index < components.length; index++) {
      const story = stories[index]
      const source = story?.match(copiedSourcePattern)?.[1]
      expect(source).toContain(`@techsio/ui-kit/molecules/${components[index]}`)
      expect(source).not.toContain("StoryPagination")
      expect(source).not.toContain("NavigationStory")
      expect(source).not.toContain("CategoryNavigation")
      expect(story).toContain(
        'source: { code: playgroundSource, language: "tsx", type: "code" }'
      )
    }
    expect(stories[2]).toContain("component: VerticalNavigation")
    for (const member of ["List", "Trigger", "Content", "Indicator"]) {
      expect(stories[0]).toContain(`### Tabs.${member}`)
    }
    expect(stories[0]).toContain("HTMLButtonElement with role=tab")
    expect(stories[0]).toContain("HTMLDivElement with role=tabpanel")
  })

  it("typechecks the exact copied examples using the public subpath export contract", () => {
    const root = fileURLToPath(new URL("../", import.meta.url))
    const packageJson = JSON.parse(readFileSync(`${root}package.json`, "utf8"))
    expect(packageJson.exports["./molecules/*"].types).toBe(
      "./dist/src/molecules/*.d.ts"
    )
    const config = ts.readConfigFile(`${root}tsconfig.json`, ts.sys.readFile)
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
    const options = {
      ...parsed.options,
      incremental: false,
      paths: { "@techsio/ui-kit/molecules/*": [`${root}src/molecules/*`] },
    }
    const files = new Map(
      components.map((component, index) => {
        const source = stories[index]?.match(copiedSourcePattern)?.[1]
        if (!source) {
          throw new Error(`Missing primary source for ${component}`)
        }
        return [
          `${root}tests/copied-${component}.tsx`,
          source.replace(sourceEscapePattern, "$1"),
        ]
      })
    )
    const host = ts.createCompilerHost(options)
    const originalGetSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (
      name,
      languageVersion,
      onError,
      shouldCreateNewSourceFile
    ) => {
      const source = files.get(name)
      return source === undefined
        ? originalGetSourceFile(
            name,
            languageVersion,
            onError,
            shouldCreateNewSourceFile
          )
        : ts.createSourceFile(
            name,
            source,
            languageVersion,
            true,
            ts.ScriptKind.TSX
          )
    }
    const program = ts.createProgram([...files.keys()], options, host)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      })
    ).toBe("")
  }, 30_000)
})
