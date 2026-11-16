// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { TenPointScale } from "../stories/atoms/rating.stories"

const animatedSvg = /<animate(?:Transform)?\b/

function source(file: string) {
  return readFileSync(new URL(file, import.meta.url), "utf8")
}

function businessAliases() {
  const values = new Map<string, string>()
  postcss
    .parse(source("../src/tokens/_business-atoms.css"))
    .walkDecls((decl) => {
      values.set(decl.prop, decl.value)
    })
  return values
}

describe("Business atom regressions", () => {
  it("preserves the typography that determines shared form-control heights", () => {
    const aliases = businessAliases()
    for (const size of ["md", "lg"]) {
      expect(aliases.has(`--text-button-${size}`)).toBe(false)
      expect(source("../src/tokens/figma/variables.css")).toContain(
        `--text-button-${size}: var(--text-${size});`
      )
    }
  })

  it("tightens only the large Business status-message gap", () => {
    const aliases = businessAliases()
    expect(aliases.get("--spacing-status-text-lg")).toBe("var(--dimension-8)")
    expect(aliases.has("--spacing-status-text-sm")).toBe(false)
    expect(aliases.has("--spacing-status-text-md")).toBe(false)
  })

  it("derives the Skeleton hierarchy from existing opaque neutral anchors", () => {
    const aliases = businessAliases()
    expect(
      aliases.get("--color-skeleton-bg-primary")?.replace(/\s+/g, "")
    ).toBe(
      "color-mix(inoklab,var(--color-fill-highlight)80%,var(--color-border-control))"
    )
    expect(aliases.get("--color-skeleton-secondary")).toBe(
      "var(--color-fill-highlight)"
    )
  })

  it("keeps a complete static spinner track with CSS-owned motion", () => {
    const css = postcss.parse(
      source("../src/tokens/components/atoms/_icon.css")
    )
    let mask = ""
    css.walkAtRules("utility", (rule) => {
      if (rule.params !== "token-icon-spinner") {
        return
      }
      rule.walkDecls("--svg", (decl) => {
        mask = decodeURIComponent(decl.value)
      })
    })
    expect(mask).toContain("fill-rule='evenodd'")
    expect(mask).toContain("fill-opacity='.25'")
    expect(mask).not.toMatch(animatedSvg)
  })

  it("bounds the ten-point example before enabling its local scroll region", () => {
    expect(TenPointScale.parameters?.layout).toBe("fullscreen")
    if (!TenPointScale.render) {
      throw new Error("Missing ten-point render")
    }
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      TenPointScale.render({}, {} as never)
    )
    const surface = canvas.firstElementChild
    expect(surface?.classList.contains("w-full")).toBe(true)
    expect(surface?.classList.contains("min-w-0")).toBe(true)
    const region = canvas.querySelector('[role="region"]')
    expect(region?.classList.contains("overflow-x-auto")).toBe(true)
    expect(region?.getAttribute("tabindex")).toBe("0")
    expect(canvas.querySelectorAll('[role="radio"]')).toHaveLength(10)
  })

  it("separates promotional badges without muting the danger role", () => {
    const aliases = businessAliases()
    expect(aliases.get("--color-badge-bg-discount")).toBe(
      "var(--color-bg-light-secondary-base)"
    )
    expect(aliases.get("--color-badge-fg-discount")).toBe(
      "var(--color-fg-accent-secondary)"
    )
    expect(aliases.has("--color-badge-bg-danger")).toBe(false)
    expect(aliases.has("--color-badge-fg-danger")).toBe(false)
  })

  it("aligns numeric value insets with the sibling Input scale", () => {
    const aliases = businessAliases()
    for (const size of ["sm", "md", "lg"]) {
      expect(aliases.get(`--padding-numeric-input-input-${size}`)).toBe(
        `var(--padding-input-inline-${size})`
      )
    }
  })

  it("keeps numeric editor resets on its existing component surface alias", () => {
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      <NumericInput defaultValue={2}>
        <NumericInput.Control>
          <NumericInput.Input aria-label="Quantity" />
        </NumericInput.Control>
      </NumericInput>
    )
    const input = canvas.querySelector('[role="spinbutton"]')
    for (const state of ["focus", "hover"]) {
      expect(
        input?.classList.contains(`${state}:bg-numeric-input-input-bg`)
      ).toBe(true)
      expect(input?.classList.contains(`${state}:bg-transparent`)).toBe(false)
    }
  })

  it("moves the contrast halo to the numeric group without discarding caller shadows", () => {
    const css = postcss.parse(
      source("../src/tokens/components/atoms/_numeric-input.css")
    )
    const shadows = new Map<string, string>()
    css.walkRules((rule) => {
      rule.walkDecls("box-shadow", (decl) => {
        shadows.set(rule.selector, decl.value)
      })
    })
    const groupShadow = shadows.get(
      '.numeric-input-focus-owner[data-part="control"]:has(:focus-visible)'
    )
    expect(groupShadow).toContain("var(--shadow-numeric-input-focus)")
    expect(groupShadow).toContain("var(--tw-shadow, 0 0 #0000)")
    const childRule = [...shadows].find(([selector]) =>
      selector.includes('[data-part="input"]')
    )
    expect(childRule?.[1]).toBe("var(--tw-shadow, 0 0 #0000)")
  })
})
