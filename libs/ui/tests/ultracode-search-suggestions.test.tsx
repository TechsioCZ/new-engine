// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss, { type AtRule } from "postcss"
import {
  type ComponentProps,
  type ComponentType,
  createElement as h,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { Link } from "../src/atoms/link"
import type { SearchSuggestionsProps } from "../src/templates/search-suggestions"
import searchSuggestionsMeta, {
  InDialog,
  Sizes,
} from "../stories/templates/search-suggestions.stories"

vi.mock("../src/molecules/dialog", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/molecules/dialog")>()
  return {
    ...actual,
    Dialog: (props: ComponentProps<typeof actual.Dialog>) =>
      h(actual.Dialog, { ...props, open: true, portal: false }),
  }
})

type Details = { image?: string; subtitle: string; price?: string }
type Props = SearchSuggestionsProps<Details>

function renderStory(
  story: typeof Sizes | typeof InDialog,
  overrides: Partial<Props> = {}
) {
  const render = story.render
  if (!render) {
    throw new Error("Missing SearchSuggestions story render")
  }
  const decorate = searchSuggestionsMeta.decorators[0]
  if (!decorate) {
    throw new Error("Missing SearchSuggestions story decorator")
  }
  const Example = render as ComponentType<Props>
  const Preview = ({ args }: { args: Props }) => h(Example, args)
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    decorate(
      Preview as never,
      {
        args: {
          ...searchSuggestionsMeta.args,
          defaultOpen: true,
          ...overrides,
        },
      } as never
    )
  )
  return canvas
}

const css = postcss.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../src/tokens/components/templates/_search-suggestions.css"
    ),
    "utf8"
  )
)

describe("SearchSuggestions preview composition", () => {
  it("gives each size its own open-results clearance without dropping rich content", () => {
    const canvas = renderStory(Sizes)
    const fixtures = canvas.querySelectorAll(".search-suggestions-preview-room")
    expect(fixtures).toHaveLength(3)
    for (const [index, fixture] of Array.from(fixtures).entries()) {
      expect(fixture.querySelectorAll('[role="combobox"]')).toHaveLength(1)
      expect(
        fixture
          .querySelector('[role="combobox"]')
          ?.getAttribute("aria-expanded")
      ).toBe("true")
      expect(
        fixture
          .querySelector(".search-suggestions-result-scope")
          ?.getAttribute("data-size")
      ).toBe(["sm", "md", "lg"][index])
      expect(fixture.querySelectorAll('[role="option"]')).toHaveLength(3)
      expect(fixture.querySelector('img[alt=""]')).not.toBeNull()
      for (const text of [
        "Products",
        "Categories",
        "Everyday trainers",
        "Limited edition trainers",
        "Footwear",
        "In stock",
        "Unavailable",
        "$89",
        "$129",
      ]) {
        expect(fixture.textContent).toContain(text)
      }
    }
  })

  it("lets the default full-results link inherit each popup's type scale", () => {
    const canvas = renderStory(Sizes)
    const links = canvas.querySelectorAll('[data-part="footer"] a')
    expect(links).toHaveLength(3)
    for (const link of links) {
      expect(link.classList.contains("link-current-size")).toBe(true)
      expect(link.classList.contains("text-link-md")).toBe(false)
      expect(link.textContent).toBe("View all results")
      expect(link.getAttribute("href")).toBe("#all-results")
    }
  })

  it("preserves an explicitly sized caller-owned footer", () => {
    const canvas = renderStory(Sizes, {
      allResultsLink: (
        <Link href="#custom-results" size="lg">
          All matching products
        </Link>
      ),
    })
    const links = canvas.querySelectorAll('[data-part="footer"] a')
    expect(links).toHaveLength(3)
    for (const link of links) {
      expect(link.classList.contains("text-link-lg")).toBe(true)
      expect(link.classList.contains("link-current-size")).toBe(false)
      expect(link.getAttribute("href")).toBe("#custom-results")
      expect(link.textContent).toBe("All matching products")
    }
  })

  it("reserves result space inside the dialog while retaining the title, label and dismiss control", () => {
    const canvas = renderStory(InDialog)
    const dialog = canvas.querySelector('[role="dialog"]')
    const fixture = dialog?.querySelector(".search-suggestions-preview-room")
    expect(
      fixture?.querySelector('[role="combobox"]')?.getAttribute("aria-expanded")
    ).toBe("true")
    expect(dialog?.querySelector("h2")?.textContent).toBe("Search catalog")
    expect(dialog?.querySelector("label")?.textContent).toBe("Search catalog")
    expect(dialog?.querySelector('[aria-label="Close dialog"]')).not.toBeNull()
    expect(dialog?.querySelectorAll('[role="option"]')).toHaveLength(3)
  })

  it("keeps clearance stable and opt-in without changing popup positioning", () => {
    let clearance: AtRule | undefined
    css.walkAtRules("utility", (rule) => {
      if (rule.params === "search-suggestions-preview-room") {
        clearance = rule
      }
    })
    expect(clearance).toBeDefined()
    expect(clearance?.toString()).toContain(
      "padding-block-end: var(--spacing-search-suggestions-preview-results)"
    )
    expect(clearance?.nodes?.some((node) => node.type === "rule")).toBe(false)
    expect(clearance?.toString()).not.toContain("!important")
    expect(clearance?.toString()).not.toContain("position:")
  })
})
