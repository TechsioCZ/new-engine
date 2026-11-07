// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss, { type AtRule } from "postcss"
import type { ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  CascadeSelect,
  type CascadeSelectItem,
  cascadeSelectVariants,
} from "../src/molecules/cascade-select"

const CSS_WHITESPACE = /\s+/g
const items: CascadeSelectItem[] = [
  {
    label: "Home & garden",
    value: "home",
    children: [
      {
        label: "Outdoor furniture and accessories",
        value: "outdoor",
        children: [{ label: "Weather-resistant dining sets", value: "dining" }],
      },
    ],
  },
]

const tokens = postcss.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../src/tokens/components/molecules/_cascade-select.css"
    ),
    "utf8"
  )
)

function utility(name: string) {
  let result: AtRule | undefined
  tokens.walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      result = rule
    }
  })
  if (!result) {
    throw new Error(`Missing CascadeSelect utility: ${name}`)
  }
  return result
}

function declaration(rule: AtRule, property: string) {
  let result: string | undefined
  rule.walkDecls(property, (decl) => {
    result = decl.value
  })
  return result
}

function field(
  props: Partial<ComponentProps<typeof CascadeSelect>> = {},
  valueProps: ComponentProps<typeof CascadeSelect.ValueText> = {}
) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    <CascadeSelect
      defaultHighlightedValue={["home", "outdoor"]}
      defaultValue={[["home", "outdoor", "dining"]]}
      items={items}
      name="category"
      {...props}
    >
      <CascadeSelect.Label>Product category</CascadeSelect.Label>
      <CascadeSelect.Control>
        <CascadeSelect.Trigger>
          <CascadeSelect.ValueText {...valueProps} />
          <CascadeSelect.Indicator />
        </CascadeSelect.Trigger>
        <CascadeSelect.ClearTrigger className="bg-cascade-select-header-bg" />
      </CascadeSelect.Control>
      <CascadeSelect.Content>
        <CascadeSelect.Node rootLabel="InternationalKitchenAndGardenEquipment" />
      </CascadeSelect.Content>
      <CascadeSelect.StatusText>
        Choose the most specific category.
      </CascadeSelect.StatusText>
    </CascadeSelect>
  )
  return canvas
}

function part(canvas: HTMLElement, name: string) {
  const node = canvas.querySelector<HTMLElement>(`[data-part="${name}"]`)
  if (!node) {
    throw new Error(`Missing CascadeSelect part: ${name}`)
  }
  return node
}

describe("CascadeSelect clear and hierarchy presentation", () => {
  it("insets clear paint without shrinking or clipping the touch target or focus ring", () => {
    const surface = utility("cascade-select-clear-surface")
    expect(declaration(surface, "background-clip")).toBe("content-box")
    expect(declaration(surface, "padding")).toBe(
      "var(--padding-cascade-select-clear)"
    )
    let coarsePointerPadding: string | undefined
    surface.walkAtRules("media", (rule) => {
      if (rule.params !== "(pointer: coarse)") {
        return
      }
      rule.walkDecls("padding", (decl) => {
        coarsePointerPadding = decl.value
      })
    })
    expect(coarsePointerPadding).toBe("var(--padding-cascade-select-clear)")
    expect(
      surface.nodes?.some(
        (node) => node.type === "decl" && node.prop === "padding"
      )
    ).toBe(false)
    for (const property of [
      "width",
      "height",
      "inline-size",
      "block-size",
      "overflow",
      "outline",
    ]) {
      expect(declaration(surface, property)).toBeUndefined()
    }
    let inset: string | undefined
    tokens.walkDecls("--padding-cascade-select-clear", (decl) => {
      inset = decl.value
    })
    expect(inset).toBe("var(--spacing-cascade-select-clear-inset)")
  })

  it.each(["xs", "sm", "md", "lg"] as const)(
    "keeps the %s action size, focus treatment, accessible name and public background override",
    (size) => {
      const canvas = field({ size, validateStatus: "success" })
      const clear = part(canvas, "clear-trigger")
      const classes = [...clear.classList]
      expect(classes).toEqual(
        expect.arrayContaining([
          "cascade-select-clear-surface",
          size === "lg"
            ? "size-action-icon-lg"
            : `size-icon-control-${size === "xs" ? "sm" : size}`,
          "focus-visible:outline-(length:--default-ring-width)",
          "focus-visible:outline-icon-control-ring",
          "bg-cascade-select-header-bg",
        ])
      )
      expect(clear.getAttribute("aria-label")).toBe("Clear selection")
      expect(clear.getAttribute("type")).toBe("button")
      expect(part(canvas, "trigger").getAttribute("data-validation")).toBe(
        "success"
      )
      expect(
        canvas.querySelector('input[name="category"]')?.getAttribute("value")
      ).toBe("home,outdoor,dining")
    }
  )

  it("reserves the actual large ActionIcon target, including coarse-pointer theme overrides", () => {
    const gutter = utility("cascade-select-clear-gutter")
    let largeSize: string | undefined
    gutter.walkRules('&[data-size="lg"]', (rule) => {
      rule.walkDecls("--cascade-select-clear-size", (decl) => {
        largeSize = decl.value
      })
    })
    expect(largeSize).toBe("var(--size-action-icon-lg)")
  })

  it("keeps slashes with the preceding path segment without removing labels or changing the submitted path", () => {
    const canvas = field()
    const text = part(canvas, "value-text").textContent ?? ""
    expect(text.replaceAll(String.fromCharCode(160), " ")).toBe(
      "Home & garden / Outdoor furniture and accessories / Weather-resistant dining sets"
    )
    expect(
      text
        .split("/")
        .slice(0, -1)
        .every((segment) => segment.endsWith(String.fromCharCode(160)))
    ).toBe(true)
    expect(
      canvas.querySelector('input[name="category"]')?.getAttribute("value")
    ).toBe("home,outdoor,dining")
  })

  it("leaves caller formatting and custom value children untouched", () => {
    expect(
      part(field({ formatValue: () => "Caller / formatting" }), "value-text")
        .textContent
    ).toBe("Caller / formatting")
    expect(
      part(field({}, { children: <strong>Caller value</strong> }), "value-text")
        .innerHTML
    ).toBe("<strong>Caller value</strong>")
  })

  it("keeps multiple-selection leaf labels and read-only affordances unchanged", () => {
    expect(part(field({ multiple: true }), "value-text").textContent).toBe(
      "Weather-resistant dining sets"
    )
    const canvas = field({ readOnly: true })
    expect(canvas.querySelector('[data-part="clear-trigger"]')).toBeNull()
    expect(canvas.querySelector('[data-part="indicator"]')).toBeNull()
    expect(part(canvas, "trigger").getAttribute("aria-readonly")).toBe("true")
  })

  it("puts indicators in the existing logical gutter rather than reserving a second flex slot", () => {
    const indicator = utility("cascade-select-row-indicator")
    expect(declaration(indicator, "position")).toBe("absolute")
    expect(declaration(indicator, "inset-inline-end")).toBe(
      "var(--popup-item-x, var(--padding-popup-item-x-md))"
    )
    for (const name of ["branchIndicator", "itemIndicator"] as const) {
      const classes = cascadeSelectVariants()[name]().split(" ")
      expect(classes).toContain("cascade-select-row-indicator")
      expect(classes.some((value) => value.includes("-me-"))).toBe(false)
    }
    const path = utility("cascade-select-item-path")
    let selectedParentPadding: string | undefined
    let selectedParentCheck: string | undefined
    path.walkRules((rule) => {
      if (
        rule.selector ===
        '&[data-state="checked"]:has(> [data-part="branch-indicator"])'
      ) {
        rule.walkDecls("padding-inline-end", (decl) => {
          selectedParentPadding = decl.value
        })
      }
      if (
        rule.selector ===
        '&:has(> [data-part="branch-indicator"]) > [data-part="item-indicator"]'
      ) {
        rule.walkDecls("inset-inline-end", (decl) => {
          selectedParentCheck = decl.value
        })
      }
    })
    expect(selectedParentPadding?.replaceAll(CSS_WHITESPACE, "")).toBe(
      "calc(var(--popup-item-x,var(--padding-popup-item-x-md))+2*var(--size-popup-indicator)+var(--popup-item-gap,var(--spacing-popup-item-md)))"
    )
    expect(selectedParentCheck?.replaceAll(CSS_WHITESPACE, "")).toBe(
      "calc(var(--popup-item-x,var(--padding-popup-item-x-md))+var(--size-popup-indicator)+var(--popup-item-gap,var(--spacing-popup-item-md)))"
    )
  })

  it("keeps long column headings fully visible and allows wrapping in RTL", () => {
    const canvas = field({ dir: "rtl", defaultOpen: true })
    const headings = canvas.querySelectorAll<HTMLElement>(
      '[data-part="column-header"] > span:last-child'
    )
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]?.textContent).toBe(
      "InternationalKitchenAndGardenEquipment"
    )
    for (const heading of headings) {
      expect([...heading.classList]).toEqual(
        expect.arrayContaining(["min-w-0", "wrap-anywhere"])
      )
      expect(heading.classList.contains("truncate")).toBe(false)
    }
    expect(
      part(canvas, "branch-indicator").classList.contains("rtl:rotate-180")
    ).toBe(true)
    expect(part(canvas, "column").getAttribute("dir")).toBe("rtl")
  })
})
