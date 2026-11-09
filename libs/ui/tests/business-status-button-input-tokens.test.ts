import { readFileSync } from "node:fs"
import postcss, { type Root } from "postcss"
import { describe, expect, it } from "vitest"

const tokens = (file: string) =>
  readFileSync(new URL(`../src/tokens/${file}`, import.meta.url), "utf8")

const parse = (file: string): Root => postcss.parse(tokens(file))

// Declarations inside the generated `@scope ([data-theme="business"])` block.
// Later declarations win, matching the cascade.
function businessScope() {
  const values = new Map<string, string>()
  parse("_scheme-scopes.css").walkAtRules("scope", (rule) => {
    if (!rule.params.startsWith('([data-theme="business"])')) {
      return
    }
    rule.walkDecls((decl) => {
      values.set(decl.prop, decl.value)
    })
  })
  return values
}

// Declarations written in the shared @theme block of a source file.
function themeValues(file: string) {
  const values = new Map<string, string>()
  parse(file).walkDecls((decl) => {
    values.set(decl.prop, decl.value)
  })
  return values
}

describe("Business status badges, outlined buttons and small Input padding", () => {
  it("reads the small Input inline padding from the Figma x/sm token", () => {
    expect(
      themeValues("components/atoms/_input.css").get(
        "--padding-input-inline-sm"
      )
    ).toBe("var(--padding-input-x-sm)")
    expect(themeValues("figma/variables.css").get("--padding-input-x-sm")).toBe(
      "var(--spacing-150)"
    )
  })

  it("lets Business inherit the 10 px small Input padding and keeps md and lg overrides", () => {
    const business = themeValues("_business-atoms.css")
    expect(business.has("--padding-input-inline-sm")).toBe(false)
    expect(business.get("--padding-input-inline-md")).toBe(
      "var(--dimension-12)"
    )
    expect(business.get("--padding-input-inline-lg")).toBe(
      "var(--dimension-16)"
    )
    expect(businessScope().has("--padding-input-inline-sm")).toBe(false)
  })

  it("aliases the Business small Textarea and NumericInput inline padding to the small Input padding", () => {
    const scope = businessScope()
    expect(scope.get("--padding-textarea-inline-sm")).toBe(
      "var(--padding-input-inline-sm)"
    )
    expect(scope.get("--padding-numeric-input-input-sm")).toBe(
      "var(--padding-input-inline-sm)"
    )
  })

  it("paints Business status badges with the light tint and dark text", () => {
    const scope = businessScope()
    expect(scope.get("--color-bg-badge-success")).toBe(
      "var(--color-secondary-100)"
    )
    expect(scope.get("--color-fg-badge-success")).toBe(
      "var(--color-secondary-800)"
    )
    expect(scope.get("--color-bg-badge-danger")).toBe("var(--color-danger-100)")
    expect(scope.get("--color-fg-badge-danger")).toBe("var(--color-danger-800)")
    expect(scope.get("--color-bg-badge-warning")).toBe(
      "var(--color-warning-100)"
    )
    expect(scope.get("--color-fg-badge-warning")).toBe(
      "var(--color-warning-800)"
    )
    expect(scope.get("--color-bg-badge-info")).toBe("var(--color-primary-100)")
    expect(scope.get("--color-fg-badge-info")).toBe("var(--color-primary-800)")
  })

  it("keeps the Business discount badge on its promotional tint", () => {
    const business = themeValues("_business-atoms.css")
    expect(business.get("--color-badge-bg-discount")).toBe(
      "var(--color-bg-light-secondary-base)"
    )
    expect(business.get("--color-badge-fg-discount")).toBe(
      "var(--color-fg-accent-secondary)"
    )
  })

  it("routes the outlined secondary button text to the teal Figma role", () => {
    expect(
      themeValues("figma/variables.css").get(
        "--color-button-fg-outlined-secondary"
      )
    ).toBe("var(--color-fg-outlined-secondary)")
    expect(businessScope().get("--color-fg-outlined-secondary")).toBe(
      "var(--color-fg-accent-secondary)"
    )
  })

  it("no longer forces grey outlined button borders in Business", () => {
    const scope = businessScope()
    for (const role of ["primary", "secondary", "tertiary"]) {
      expect(scope.get(`--color-button-border-${role}`)).toBeUndefined()
    }
    expect(scope.get("--color-button-fg-secondary-borderless")).toBeUndefined()
    expect(scope.get("--border-width-button-md")).toBeUndefined()
    expect(scope.get("--border-width-button-lg")).toBeUndefined()
  })
})
