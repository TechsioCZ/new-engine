import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

const tokenAlias = /^var\(--/
const variableReference = /var\(\s*(--[\w-]+)/g
const relativeImport = /^["'](\.[^"']+)["']/

const css = postcss.parse(
  readFileSync(new URL("../src/tokens/_business.css", import.meta.url), "utf8")
)

function businessTokens() {
  const tokens = new Map<string, string>()
  css.walkRules('[data-theme="business"]', (rule) => {
    if (rule.parent?.type === "root") {
      rule.walkDecls((decl) => {
        tokens.set(decl.prop, decl.value)
      })
    }
  })
  return tokens
}

describe("business theme", () => {
  const tokens = businessTokens()

  it("keeps application and component surfaces on the same white role", () => {
    expect(tokens.get("--color-fill-surface")).toBe("var(--color-white)")
    expect(tokens.get("--color-surface")).toBe("var(--color-fill-surface)")
    expect(tokens.get("--color-form-control-bg")).toBe(
      "var(--color-fill-surface)"
    )
    expect(tokens.get("--color-form-control-bg-focus")).toBe(
      "var(--color-fill-surface)"
    )
  })

  it("separates quiet row selection from solid control selection", () => {
    expect(tokens.get("--color-tree-view-node-bg-selected")).toBe(
      "var(--color-primary-100)"
    )
    expect(tokens.get("--color-table-row-bg-selected")).toBe(
      "var(--color-primary-100)"
    )
    expect(tokens.has("--color-fill-selected")).toBe(false)
    expect(tokens.get("--color-fg-on-primary-indicator")).toBe(
      "var(--color-white)"
    )
  })

  it("pairs every status chip with semantic tint and readable text aliases", () => {
    for (const variant of [
      "primary",
      "secondary",
      "success",
      "warning",
      "danger",
      "info",
      "tertiary",
      "discount",
    ]) {
      expect(tokens.get(`--color-badge-bg-${variant}`)).toMatch(tokenAlias)
      expect(tokens.get(`--color-badge-fg-${variant}`)).toMatch(tokenAlias)
    }
  })

  it("preserves the mobile input font floor and grows controls for touch", () => {
    expect(tokens.get("--text-input-sm")).toBe("max(16px, var(--text-sm))")
    const coarse = css.nodes.find(
      (node) => node.type === "atrule" && node.params === "(pointer: coarse)"
    )
    expect(coarse?.toString()).toContain("--height-form-control-sm: max(")
    expect(coarse?.toString()).toContain("2.75rem")
  })

  it("does not target other brands or change the root theme", () => {
    css.walkRules((rule) => {
      const inBusinessScope =
        rule.parent?.type === "atrule" &&
        rule.parent.name === "scope" &&
        rule.parent.params.startsWith('([data-theme="business"])')
      expect(
        rule.selector === '[data-theme="business"]' || inBusinessScope
      ).toBe(true)
    })
  })

  it("does not introduce color aliases that depend on Tailwind's default theme", () => {
    const declarations = new Set<string>()
    const visited = new Set<string>()
    function collect(file: string) {
      if (visited.has(file)) {
        return
      }
      visited.add(file)
      const source = postcss.parse(readFileSync(file, "utf8"))
      source.walkDecls((decl) => {
        declarations.add(decl.prop)
      })
      source.walkAtRules("import", (rule) => {
        const relative = rule.params.match(relativeImport)?.[1]
        if (relative) {
          collect(path.resolve(path.dirname(file), relative))
        }
      })
    }
    collect(
      fileURLToPath(new URL("../src/tokens/_tokens-base.css", import.meta.url))
    )
    for (const value of tokens.values()) {
      for (const [, name] of value.matchAll(variableReference)) {
        expect(name !== undefined && declarations.has(name), name).toBe(true)
      }
    }
  })

  it("projects business overrides into generated local scheme boundaries", () => {
    const scopes = postcss.parse(
      readFileSync(
        new URL("../src/tokens/_scheme-scopes.css", import.meta.url),
        "utf8"
      )
    )
    const projected = new Map<string, string>()
    scopes.walkAtRules("scope", (scope) => {
      if (scope.params === '([data-theme="business"]) to ([data-theme])') {
        scope.walkDecls((decl) => {
          projected.set(decl.prop, decl.value)
        })
      }
    })
    for (const [name, value] of tokens) {
      expect(projected.get(name), name).toBe(value)
    }
  })
})
