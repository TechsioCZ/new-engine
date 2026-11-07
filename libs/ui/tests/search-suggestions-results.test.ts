import { readFileSync } from "node:fs"
import postcss from "postcss"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  type SearchSuggestionGroup,
  SearchSuggestions,
  type SearchSuggestionsProps,
  searchSuggestionsResultVariants,
} from "../src/templates/search-suggestions"

const RESULT_SCOPE =
  /<span class="[^"]*search-suggestions-result-scope[^"]*" data-size="([^"]*)">/g
const LINK_TAG = /<a\b[^>]*>/g
const HIDING_TITLE = /truncate|line-clamp|overflow-hidden/
const WHITESPACE = /\s+/g
const compact = (value: string) => value.replace(WHITESPACE, "")
const styles = searchSuggestionsResultVariants()
type Details = { image?: string; subtitle: string; price: string }
const groups: SearchSuggestionGroup<Details>[] = [
  {
    id: "products",
    label: "Products",
    items: [
      {
        value: "trainer",
        label: "Everyday trainers",
        href: "#trainer",
        data: { image: "trainer.avif", subtitle: "In stock", price: "$89" },
      },
      {
        value: "unavailable",
        label: "Limited edition trainers",
        href: "#unavailable",
        disabled: true,
        data: { subtitle: "Unavailable", price: "$129" },
      },
    ],
  },
]

const resultSlot: SearchSuggestionsProps<Details>["resultSlot"] = (item) =>
  h(
    "span",
    { className: styles.row() },
    item.data?.image &&
      h("img", { alt: "", src: item.data.image, className: styles.image() }),
    h(
      "span",
      { className: styles.body() },
      h("span", { className: styles.title() }, item.label),
      h("span", { className: styles.subtitle() }, item.data?.subtitle)
    ),
    h("span", { className: styles.price() }, item.data?.price)
  )

const render = (props: Partial<SearchSuggestionsProps<Details>> = {}) =>
  renderToStaticMarkup(
    h(SearchSuggestions<Details>, {
      groups,
      label: "Search catalog",
      defaultOpen: true,
      resultSlot,
      ...props,
    })
  )

const tokens = postcss.parse(
  readFileSync(
    new URL(
      "../src/tokens/components/templates/_search-suggestions.css",
      import.meta.url
    ),
    "utf8"
  )
)

function declarations(name: string, params: string) {
  const values = new Map<string, string>()
  tokens.walkAtRules(name, (rule) => {
    if (rule.params === params) {
      for (const node of rule.nodes ?? []) {
        if (node.type === "decl") {
          values.set(node.prop, compact(node.value))
        }
      }
    }
  })
  return values
}

function ruleDeclarations(selector: string) {
  const values = new Map<string, string>()
  tokens.walkRules((rule) => {
    if (compact(rule.selector) === compact(selector)) {
      for (const node of rule.nodes ?? []) {
        if (node.type === "decl") {
          values.set(node.prop, compact(node.value))
        }
      }
    }
  })
  return values
}

describe("SearchSuggestions rich result composition", () => {
  it.each(["sm", "md", "lg"] as const)(
    "carries the %s size with result content, not the portal ancestor",
    (size) => {
      const html = render({ size })
      const scopes = html.matchAll(RESULT_SCOPE)
      expect([...scopes].map((match) => match[1])).toEqual([size, size])
    }
  )

  it("wraps the title without sacrificing image, metadata or price", () => {
    expect(styles.title()).toContain("wrap-anywhere")
    expect(styles.title()).toContain("whitespace-normal")
    expect(styles.title()).not.toMatch(HIDING_TITLE)
    expect(styles.body()).toContain("min-w-0")
    expect(styles.row()).toContain("gap-search-suggestions-result")
    expect(styles.image()).toContain("size-search-suggestions-result-image")
    expect(styles.price()).toContain("shrink-0")
    const html = render()
    for (const text of [
      "Everyday trainers",
      "In stock",
      "$89",
      "Limited edition trainers",
      "Unavailable",
      "$129",
    ]) {
      expect(html).toContain(text)
    }
    expect(html).toContain('alt=""')
    expect(html).toContain('src="trainer.avif"')
  })

  it("keeps accessible names and the unavailable result non-navigable", () => {
    const html = render()
    const links = [...html.matchAll(LINK_TAG)].map((match) => match[0])
    expect(links).toHaveLength(2)
    expect(links[0]).toContain('aria-label="Everyday trainers"')
    expect(links[0]).toContain('href="#trainer"')
    expect(links[1]).toContain('aria-label="Limited edition trainers"')
    expect(links[1]).toContain("data-disabled")
    expect(links[1]).not.toContain("href=")
    expect(html).toContain('data-part="item-group-label"')
    expect(html).toContain("Products")
  })

  it("passes custom results through unchanged without interpreting their data", () => {
    const custom = h("span", { "data-custom-result": true }, "Custom content")
    const slot = vi.fn(() => custom)
    const item = groups[0]?.items[0]
    if (!item) {
      throw new Error("The custom-result fixture must contain a product")
    }
    const element = SearchSuggestions({ groups, resultSlot: slot, size: "sm" })
    const wrapped = element.props.renderItem?.(item)
    expect(slot).toHaveBeenCalledExactlyOnceWith(item)
    expect(wrapped?.props.children).toBe(custom)
    expect(item.data).toEqual({
      image: "trainer.avif",
      subtitle: "In stock",
      price: "$89",
    })
  })

  it("keeps routing, query ownership, footer and validation props authoritative", () => {
    const navigate = vi.fn()
    const onInputValueChange = vi.fn()
    const footer = h("a", { href: "#all" }, "View all results")
    const element = SearchSuggestions({
      groups,
      navigate,
      onInputValueChange,
      inputValue: "trainers",
      validateStatus: "error",
      helpText: "Enter a product reference.",
      allResultsLink: footer,
      portalled: true,
    })
    expect(element.props).toMatchObject({
      navigate,
      onInputValueChange,
      inputValue: "trainers",
      validateStatus: "error",
      helpText: "Enter a product reference.",
      footer,
      portalled: true,
      mode: "navigation",
      inputBehavior: "none",
      filterBehavior: "external",
    })
    expect(render({ resultSlot: undefined })).toContain("Everyday trainers")
  })
})

describe("SearchSuggestions result tokens", () => {
  it.each([
    ["sm", "xs"],
    ["md", "sm"],
    ["lg", "md"],
  ])(
    "keeps the %s subtitle one typography step below its title",
    (size, text) => {
      expect(
        declarations("theme", "static").get(
          `--text-search-suggestions-subtitle-${size}`
        )
      ).toBe(`var(--text-${text})`)
      expect(
        declarations("utility", "search-suggestions-result-subtitle").get(
          "font-size"
        )
      ).toContain("--search-suggestions-subtitle-size")
    }
  )

  it("provides independent item, group and sibling spacing tokens", () => {
    const theme = declarations("theme", "static")
    for (const size of ["sm", "md", "lg"]) {
      expect(theme.get(`--padding-search-suggestions-item-y-${size}`)).toBe(
        `var(--padding-popup-item-y-${size})`
      )
      expect(theme.get(`--padding-search-suggestions-group-y-${size}`)).toBe(
        `var(--padding-popup-item-y-${size})`
      )
    }
    expect(
      ruleDeclarations('> [data-part="item"] + [data-part="item"]').get(
        "margin-block-start"
      )
    ).toBe("var(--spacing-search-suggestions-result-rows)")
  })

  it("reclaims the navigation indicator gutter only in marked result groups", () => {
    const scoped = tokens.nodes.find(
      (node) =>
        node.type === "rule" &&
        compact(node.selector) ===
          compact(
            '[data-scope="combobox"][data-part="item-group"]:has(> [data-part="item"] > .search-suggestions-result-scope)'
          )
    )
    expect(scoped?.type).toBe("rule")
    expect(
      ruleDeclarations('> [data-part="item"]').get("padding-inline-end")
    ).toBe("var(--popup-item-x,var(--padding-popup-item-x-md))")
  })

  it("preserves state-paired foregrounds for smaller metadata", () => {
    const state = ruleDeclarations(
      '[data-scope="combobox"][data-part="item"]:is(:hover, [data-highlighted], [data-state="checked"], [data-disabled]) > .search-suggestions-result-scope'
    )
    expect(state.get("--color-search-suggestions-subtitle-fg")).toBe(
      "var(--color-combobox-item-fg-secondary)"
    )
  })
})
