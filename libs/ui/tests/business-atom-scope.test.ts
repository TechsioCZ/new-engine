import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  new URL("../src/tokens/_business-atoms.css", import.meta.url),
  "utf8"
)
const css = postcss.parse(source)
const atomToken =
  /^--(?:color|text|font-weight|border-width|padding|spacing|radius)-(?:action-icon|badge|button|checkbox|hotkeys|image|input|numeric-input|rating|skeleton|textarea)(?:-|$)/

const newPaletteValue = /#[\da-f]+|oklch\(/i

describe("Business atom scope", () => {
  it("changes component aliases without redesigning shared theme tokens", () => {
    const properties: string[] = []
    css.walkDecls((declaration) => {
      properties.push(declaration.prop)
      expect(declaration.prop).toMatch(atomToken)
    })
    expect(properties.length).toBeGreaterThan(0)
    expect(new Set(properties).size).toBe(properties.length)
  })

  it("keeps overrides confined to the Business brand", () => {
    const selectors: string[] = []
    css.walkRules((rule) => {
      selectors.push(rule.selector)
    })
    expect(selectors).toEqual(['[data-theme="business"]'])
  })

  it("uses existing theme values rather than introducing a new palette or scale", () => {
    css.walkDecls((declaration) => {
      expect(declaration.value).toContain("var(--")
      expect(declaration.value).not.toMatch(newPaletteValue)
    })
  })
})
