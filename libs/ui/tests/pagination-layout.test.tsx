// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { URL } from "node:url"
import postcss from "postcss"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Pagination, paginationVariants } from "../src/molecules/pagination"
import paginationMeta, {
  EdgeCases,
  RealWorldScenarios,
} from "../stories/molecules/pagination.stories"

function renderStory(story: typeof EdgeCases) {
  if (!story.render) {
    throw new Error("Pagination examples must retain their composition")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    story.render({} as never, {} as never)
  )
  return canvas
}

describe("pagination layout contracts", () => {
  it("lets an intrinsically contained pager shrink inside a flex host", () => {
    expect(paginationVariants().base().split(" ")).toContain("min-w-0")
  })

  it("wraps non-condensable page lists without dropping arrowless destinations", () => {
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      h(Pagination, {
        count: 100,
        pageSize: 10,
        siblingCount: 3,
        showPrevNext: false,
        defaultPage: 5,
        getPageUrl: ({ page }) => `#page-${page}`,
      })
    )
    const list = canvas.querySelector("ul")
    expect(list?.classList.contains("flex-wrap")).toBe(true)
    expect(list?.classList.contains("flex-nowrap")).toBe(false)
    expect(list?.hasAttribute("data-responsive-pages")).toBe(false)
    for (let page = 1; page <= 10; page++) {
      expect(list?.querySelector(`a[href="#page-${page}"]`)).not.toBeNull()
    }
  })

  it("isolates compact spacing without changing regular pagination", () => {
    const regular = paginationVariants().list().split(" ")
    const compact = paginationVariants({ compact: true }).list().split(" ")
    expect(regular).toContain("gap-pagination-list")
    expect(compact).toContain("gap-pagination-list-compact")
    expect(compact).not.toContain("gap-pagination-list")

    const declarations = new Map<string, string>()
    const tokenFile = "../src/tokens/components/molecules/_pagination.css"
    postcss
      .parse(readFileSync(new URL(tokenFile, import.meta.url), "utf8"))
      .walkDecls((declaration) => {
        declarations.set(declaration.prop, declaration.value)
      })
    expect(declarations.get("--spacing-pagination-compact")).toBe(
      "var(--spacing-pagination-list)"
    )
    expect(declarations.get("--spacing-pagination-list-compact")).toBe(
      "var(--spacing-pagination-compact)"
    )

    const html = renderToStaticMarkup(
      h(Pagination, {
        compact: true,
        count: 250,
        defaultPage: 5,
        getPageUrl: ({ page }) => `#page-${page}`,
      })
    )
    const canvas = document.createElement("div")
    canvas.innerHTML = html
    expect(
      canvas
        .querySelector("ul")
        ?.classList.contains("gap-pagination-list-compact")
    ).toBe(true)
    expect(
      canvas.querySelector('[data-part="compact-text"]')?.textContent
    ).toBe("5 of 25")
    expect(
      canvas.querySelector('[data-part="prev-trigger"]')?.getAttribute("href")
    ).toBe("#page-4")
    expect(
      canvas.querySelector('[data-part="next-trigger"]')?.getAttribute("href")
    ).toBe("#page-6")
  })

  it("bounds the catalogue host rather than using centered intrinsic sizing", () => {
    expect(paginationMeta.parameters?.layout).toBe("fullscreen")
    const decorators = paginationMeta.decorators
    const decorator = Array.isArray(decorators) ? decorators[0] : decorators
    if (typeof decorator !== "function") {
      throw new Error("Pagination must retain its bounded surface decorator")
    }
    const surface = document.createElement("div")
    surface.innerHTML = renderToStaticMarkup(
      decorator(() => h("span", null, "Pager"), {} as never)
    )
    expect(
      surface.querySelector(".w-full.min-w-0.p-200 > .w-full.min-w-0.max-w-md")
    ).not.toBeNull()
  })

  it.each([EdgeCases, RealWorldScenarios])(
    "uses local row rhythm rather than the shared 800 section spacing",
    (story) => {
      const canvas = renderStory(story)
      expect(canvas.firstElementChild?.classList.contains("gap-300")).toBe(true)
      expect(canvas.firstElementChild?.classList.contains("space-y-800")).toBe(
        false
      )
    }
  )

  it("allows the table card and footer pager to shrink without clipping content", () => {
    const canvas = renderStory(RealWorldScenarios)
    const pager = canvas.querySelector(
      'nav[aria-label="Pagination, Table navigation 1"]'
    )
    const card = pager?.parentElement?.parentElement
    expect(card?.parentElement?.classList.contains("min-w-0")).toBe(true)
    expect(card?.parentElement?.classList.contains("w-full")).toBe(true)
    expect(pager?.classList.contains("min-w-0")).toBe(true)
    expect(card?.textContent).toContain("Table content area")
    expect(card?.textContent).toContain("20 items per page")
    expect(card?.className).not.toContain("overflow-hidden")
  })

  it("keeps both arrows enabled for the intentional middle-page minimal example", () => {
    const canvas = renderStory(EdgeCases)
    const minimal = canvas.querySelector(
      'nav[aria-label="Pagination, Very few pages 3"]'
    )
    expect(minimal?.querySelector('[aria-current="page"]')?.textContent).toBe(
      "2"
    )
    expect(
      minimal?.querySelector('[data-part="prev-trigger"]')?.getAttribute("href")
    ).toContain("page=1")
    expect(
      minimal?.querySelector('[data-part="next-trigger"]')?.getAttribute("href")
    ).toContain("page=3")
    expect(minimal?.querySelector('[aria-disabled="true"]')).toBeNull()
  })
})
