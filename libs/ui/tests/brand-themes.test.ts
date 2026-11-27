import { describe, expect, it } from "vitest"
import { brandContrast, validateBrand } from "../src/theme/brand-validator"
import { akrosBrand, builtInBrands } from "../src/theme/built-in-brands"
import {
  availableModeSettings,
  BrandDefinitionError,
  brandStylesheet,
  defineBrand,
  extendBrand,
  resolveAppearance,
} from "../src/theme/theme-config"

const ocean = {
  key: "ocean",
  label: "Ocean",
  modes: ["light", "dark"],
  tokens: {
    "--color-primary-700":
      "light-dark(oklch(0.4 0.12 230), oklch(0.38 0.12 230))",
    "--color-bg-primary-base": "var(--color-primary-700)",
    "--color-fg-on-primary-solid-neo": "var(--color-white)",
  },
}

describe("built-in brands", () => {
  it.each(builtInBrands.map((brand) => [brand.key, brand]))(
    "%s passes the brand validator",
    (_key, brand) => {
      expect(validateBrand(brand)).toMatchObject({ ok: true, brand })
    }
  )
  it("reads contrast of the primary button", () => {
    expect(
      brandContrast(
        akrosBrand,
        "light",
        "--color-button-fg-primary",
        "--color-bg-primary-base"
      )
    ).toBeGreaterThan(4.5)
  })
})

describe("brand data", () => {
  it("accepts a two-mode brand from untrusted data", () => {
    expect(defineBrand(ocean).modes).toEqual(["light", "dark"])
    expect(validateBrand(ocean).ok).toBe(true)
  })
  it.each([
    ["an unsafe value", { "--color-primary-500": "red;} body{display:none" }],
    ["a closing style tag", { "--color-primary-500": "</style>" }],
    ["a url", { "--color-primary-500": "url(https://x)" }],
    ["a malformed name", { "color-primary-500": "red" }],
  ])("rejects %s", (_label, tokens) => {
    expect(() => defineBrand({ ...ocean, tokens })).toThrow(
      BrandDefinitionError
    )
  })
  it("rejects tokens the foundation does not have", () => {
    const result = validateBrand({
      ...ocean,
      tokens: { "--color-made-up": "red" },
    })
    expect(result.ok).toBe(false)
  })
  it("warns about an alias turned into a literal", () => {
    const result = validateBrand({
      ...ocean,
      tokens: { ...ocean.tokens, "--color-fill-base": "oklch(0.5 0.1 20)" },
    })
    expect(result.warnings).toEqual([
      "--color-fill-base: must alias another token, as the foundation does",
    ])
  })
  it("rejects a primary button below WCAG AA", () => {
    const result = validateBrand({
      key: "pale",
      label: "Pale",
      modes: ["light"],
      tokens: {
        "--color-bg-primary-base": "var(--color-white)",
        "--color-button-fg-primary": "var(--color-white)",
      },
    })
    expect(result.ok).toBe(false)
  })
})

describe("modes", () => {
  const dark = defineBrand({
    ...ocean,
    key: "night",
    modes: ["dark"],
    tokens: {},
  })
  it("offers a switch only for a brand with both modes", () => {
    expect(availableModeSettings(defineBrand(ocean))).toEqual([
      "light",
      "dark",
      "system",
    ])
    expect(availableModeSettings(akrosBrand)).toEqual(["light"])
    expect(availableModeSettings(dark)).toEqual(["dark"])
  })
  it("locks a single-mode brand to its mode", () => {
    expect(resolveAppearance(dark, "light", "light")).toBe("dark")
    expect(resolveAppearance(akrosBrand, "system", "dark")).toBe("light")
    expect(resolveAppearance(defineBrand(ocean), "system", "dark")).toBe("dark")
  })
})

describe("stylesheet", () => {
  it("scopes a brand up to the next nested brand", () => {
    const css = brandStylesheet(defineBrand(ocean))
    expect(css).toContain('@scope ([data-theme="ocean"]) to ([data-theme])')
    expect(css).toContain("--color-bg-primary-base: var(--color-primary-700);")
  })
  it("extends a brand for a subtree", () => {
    const report = extendBrand(akrosBrand, {
      key: "akros-report",
      tokens: { "--color-bg-primary-base": "var(--color-primary-800)" },
    })
    expect(report.tokens["--color-bg-primary-base"]).toBe(
      "var(--color-primary-800)"
    )
    expect(Object.keys(report.tokens).length).toBe(
      Object.keys(akrosBrand.tokens).length
    )
    expect(report.modes).toEqual(akrosBrand.modes)
  })
})
