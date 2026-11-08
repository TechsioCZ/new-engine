// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
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

  it("uses opaque neutral surfaces for both skeleton treatments", () => {
    const aliases = businessAliases()
    expect(aliases.get("--color-skeleton-bg-primary")).toBe(
      "var(--color-fill-highlight)"
    )
    expect(aliases.get("--color-skeleton-secondary")).toBe(
      "var(--color-fill-overlay)"
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
})
