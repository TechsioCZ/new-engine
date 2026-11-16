import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { StatusText } from "../src/atoms/status-text"

function source(file: string) {
  return readFileSync(new URL(file, import.meta.url), "utf8")
}

function glyphAliases(file: string) {
  const aliases = new Map<string, string>()
  postcss.parse(source(file)).walkAtRules("utility", (rule) => {
    rule.walkAtRules("apply", (apply) => {
      aliases.set(rule.params, apply.params)
    })
  })
  return aliases
}

const iconFile = "../src/tokens/components/atoms/_icon.css"
const statusFile = "../src/tokens/components/atoms/_status-text.css"

describe("feedback visual clarity", () => {
  it.each([
    ["error", "alert-circle"],
    ["success", "check-bold"],
    ["warning", "alert"],
  ])("gives %s feedback its own existing solid silhouette", (status, glyph) => {
    const target = `token-icon-${glyph}`
    expect(
      glyphAliases(statusFile).get(`token-icon-status-text-${status}`)
    ).toBe(target)
    expect(glyphAliases(iconFile).has(target)).toBe(true)
  })

  it.each([
    ["error", "alert-circle"],
    ["success", "check-circle"],
    ["warning", "alert"],
  ])("preserves generic and Input %s glyph contracts", (status, glyph) => {
    const aliases = glyphAliases(iconFile)
    expect(aliases.get(`token-icon-${status}`)).toBe(
      `icon-[mdi-light--${glyph}]`
    )
    expect(aliases.get(`token-icon-input-${status}`)).toBe(
      `token-icon-${status}`
    )
  })

  it("keeps the Business error prompt on the normal Textarea placeholder alias", () => {
    const aliases = new Map<string, string>()
    postcss
      .parse(source("../src/tokens/_business-atoms.css"))
      .walkDecls((decl) => {
        aliases.set(decl.prop, decl.value)
      })
    expect(aliases.get("--color-textarea-placeholder-danger")).toBe(
      "var(--color-textarea-fg-placeholder)"
    )
  })

  it("preserves live roles, explicit icons and iconless helper text", () => {
    const custom = renderToStaticMarkup(
      <StatusText icon="token-icon-home" status="error">
        Check the address.
      </StatusText>
    )
    expect(custom).toContain('role="alert"')
    expect(custom).toContain("token-icon-home")
    expect(custom).not.toContain("token-icon-status-text-error")
    const hidden = renderToStaticMarkup(
      <StatusText showIcon={false} status="warning">
        Delivery is delayed.
      </StatusText>
    )
    expect(hidden).toContain('role="status"')
    expect(hidden).not.toContain("token-icon-")
    const helper = renderToStaticMarkup(
      <StatusText>Order updates only.</StatusText>
    )
    expect(helper).not.toContain("role=")
    expect(helper).not.toContain("token-icon-")
  })
})
