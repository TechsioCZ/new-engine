import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/postcss"
import postcss, {
  type AtRule,
  type Declaration,
  type Node,
  type Rule,
} from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Label } from "../src/atoms/label"

// Focused regression for the Business label hierarchy: the alias the Label atom
// wears must stay a live reference, and only Business may quiet it.
const tokensDir = fileURLToPath(new URL("../src/tokens/", import.meta.url))
const tokensSource = (file: string) =>
  readFileSync(path.join(tokensDir, file), "utf8")
const labelSource = readFileSync(
  new URL("../src/atoms/label.tsx", import.meta.url),
  "utf8"
)

const LABEL_WEIGHT = "--font-weight-label"
const SHARED_WEIGHT = "var(--font-weight-bold)"
const BUSINESS_WEIGHT = "var(--font-weight-semibold)"
const THEME_SCOPE = /\[data-theme="([^"]+)"\]/
const CLASS_ATTRIBUTE = /class="([^"]+)"/

function weightDeclarations(css: string) {
  const found: Declaration[] = []
  postcss.parse(css).walkDecls(LABEL_WEIGHT, (decl) => {
    found.push(decl)
  })
  return found
}

// The nearest enclosing `@scope ([data-theme="…"])` names the brand that owns
// a declaration; a declaration outside any brand scope is shared.
function brandOf(node: Node | undefined): string | null {
  let current = node
  while (current) {
    if (current.type === "atrule") {
      const rule = current as AtRule
      if (rule.name === "scope") {
        return THEME_SCOPE.exec(rule.params)?.[1] ?? null
      }
    }
    current = current.parent as Node | undefined
  }
  return null
}

function brandScope(css: string, brand: string) {
  let scope: AtRule | undefined
  postcss.parse(css).walkAtRules("scope", (rule) => {
    if (THEME_SCOPE.exec(rule.params)?.[1] === brand) {
      scope = rule
    }
  })
  return scope
}

describe("Business label weight hierarchy", () => {
  it("preserves a caller's weight utility through the component merge", () => {
    const html = renderToStaticMarkup(
      <Label className="font-medium" htmlFor="name">
        Full name
      </Label>
    )
    const classes = html.match(CLASS_ATTRIBUTE)?.[1]?.split(" ") ?? []
    expect(classes).toContain("font-medium")
    expect(classes).not.toContain("font-label")
    expect(classes).toContain("text-label-fg")
    expect(html).toContain('for="name"')
  })

  it("quiets the label weight only inside the Business brand", () => {
    const authored = weightDeclarations(tokensSource("_business-atoms.css"))
    expect(authored).toHaveLength(1)
    const [declaration] = authored
    if (!declaration) {
      throw new Error("Business atoms must own the label weight alias")
    }
    expect((declaration.parent as Rule).selector).toBe(
      '[data-theme="business"]'
    )
    // An existing weight primitive, not a new literal scale or palette entry.
    expect(declaration.value).toBe(BUSINESS_WEIGHT)
  })

  it("regenerates the shared bold default and the Business semibold override", () => {
    const generated = tokensSource("_scheme-scopes.css")
    const resolved = weightDeclarations(generated).map((declaration) => ({
      brand: brandOf(declaration.parent),
      value: declaration.value,
    }))
    expect(resolved).toEqual([
      { brand: null, value: SHARED_WEIGHT },
      { brand: "business", value: BUSINESS_WEIGHT },
    ])
    for (const other of ["n1", "akros"]) {
      const scope = brandScope(generated, other)
      if (!scope) {
        throw new Error(`${other} brand scope must exist`)
      }
      const overrides: string[] = []
      scope.walkDecls(LABEL_WEIGHT, (declaration) => {
        overrides.push(declaration.value)
      })
      expect(overrides).toEqual([])
    }
  })

  it("emits a font-label utility that reads the runtime alias", async () => {
    expect(labelSource).toContain('"font-label"')

    const input = [
      '@import "tailwindcss" source(none);',
      `@import "${path.join(tokensDir, "figma/variables.css")}";`,
      `@import "${path.join(tokensDir, "_scheme-scopes.css")}";`,
      '@source inline("font-label font-medium");',
      "",
    ].join("\n")
    const { css } = await postcss([tailwindcss()]).process(input, {
      from: path.join(tokensDir, "label-emitted-probe.css"),
    })

    const utilities = new Map<string, Rule>()
    postcss.parse(css).walkRules((rule) => {
      utilities.set(rule.selector, rule)
    })
    const weightOf = (selector: string) =>
      utilities
        .get(selector)
        ?.nodes.find(
          (node): node is Declaration =>
            node.type === "decl" && node.prop === "font-weight"
        )?.value

    // The utility must reference the alias so a brand scope (or a caller) can
    // repaint it; copying the value at build time would freeze the weight.
    expect(weightOf(".font-label")).toBe(`var(${LABEL_WEIGHT})`)
    expect(weightOf(".font-medium")).toBe("var(--font-weight-medium)")
    // `font-label` is a weight utility, not a font family.
    expect(
      utilities
        .get(".font-label")
        ?.nodes.some(
          (node) => node.type === "decl" && node.prop === "font-family"
        )
    ).toBe(false)

    const business = brandScope(css, "business")
    if (!business) {
      throw new Error("Business scope must survive the Tailwind build")
    }
    const businessWeights: string[] = []
    business.walkDecls(LABEL_WEIGHT, (declaration) => {
      businessWeights.push(declaration.value)
    })
    expect(businessWeights).toEqual([BUSINESS_WEIGHT])
  })
})
