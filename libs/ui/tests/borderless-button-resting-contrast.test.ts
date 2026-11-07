import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, it } from "vitest"
import { buttonVariants } from "../src/atoms/button"

const css = (file: string) =>
  postcss.parse(readFileSync(new URL(file, import.meta.url), "utf8"))
const exported = css("../src/tokens/figma/variables.css")
const foundation = css("../src/tokens/_foundation-overrides.css")
const brands = css("../src/tokens/figma/brand-overrides.css")
const foreground = "--color-button-fg-primary-borderless"
const referencePattern = /^var\((--[\w-]+)\)$/
const oklchPattern = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/
const whitespacePattern = /\s+/g

type Appearance = "light" | "dark"

function tokens(brand?: string, corrected = true) {
  const values = new Map<string, string>()
  exported.walkDecls((decl) => {
    values.set(decl.prop, decl.value)
  })
  if (corrected) {
    foundation.walkAtRules("theme", (rule) => {
      rule.walkDecls((decl) => {
        values.set(decl.prop, decl.value)
      })
    })
  }
  if (brand) {
    // Brand declarations are unlayered and override the default @theme.
    for (const sheet of corrected ? [brands, foundation] : [brands]) {
      sheet.walkRules(`[data-theme="${brand}"]`, (rule) => {
        rule.walkDecls((decl) => {
          values.set(decl.prop, decl.value)
        })
      })
    }
  }
  return values
}

function resolve(
  values: Map<string, string>,
  name: string,
  appearance: Appearance
): string {
  let value = values.get(name)
  if (!value) {
    throw new Error(`Missing token ${name}`)
  }
  if (value.startsWith("light-dark(")) {
    // These source tokens contain no nested commas inside either branch.
    const branches = value.slice(11, -1).split(",")
    value = branches[appearance === "light" ? 0 : 1]?.trim()
    if (!value) {
      throw new Error(`Missing ${appearance} branch for ${name}`)
    }
  }
  const reference = value.match(referencePattern)?.[1]
  return reference ? resolve(values, reference, appearance) : value
}

function luminance(value: string) {
  const match = value.match(oklchPattern)
  if (!match) {
    throw new Error(`Expected an opaque OKLCH token, got ${value}`)
  }
  const lightness = Number(match[1])
  const chroma = Number(match[2])
  const hue = (Number(match[3]) * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3
  const m = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3
  const s = (lightness - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3
  const red = 4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s
  const green = -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s
  const blue = -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastOnReportedSurface(color: string) {
  // CI's composited resting surface was #e2e2e3. This is a source-token
  // regression, not browser/compositing verification of the generated scopes.
  const channels = [0xe2, 0xe2, 0xe3].map((channel) => {
    const value = channel / 255
    return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const background =
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  return (background + 0.05) / (luminance(color) + 0.05)
}

describe("primary borderless button resting contrast", () => {
  it("reproduces the exported base-light failure on the reported surface", () => {
    const ratio = contrastOnReportedSurface(
      resolve(tokens(undefined, false), foreground, "light")
    )
    expect(ratio).toBeGreaterThan(4.4)
    expect(ratio).toBeLessThan(4.5)
  })

  it("gives base-light normal text contrast headroom through a core alias", () => {
    expect(tokens().get(foreground)?.replaceAll(whitespacePattern, "")).toBe(
      "light-dark(var(--color-neutral-600),var(--color-fg-accent-primary))"
    )
    expect(
      contrastOnReportedSurface(resolve(tokens(), foreground, "light"))
    ).toBeGreaterThanOrEqual(5)
  })

  it("preserves the base-dark foreground for dark and reverse scopes", () => {
    expect(resolve(tokens(), foreground, "dark")).toBe(
      resolve(tokens(undefined, false), foreground, "dark")
    )
  })

  it.each(["business", "neo", "akros"])(
    "preserves %s's semantic accent in both appearances and scope regeneration",
    (brand) => {
      // Explicit brand corrections are consumed by validate-token-scopes.js.
      let correction: string | undefined
      foundation.walkRules(`[data-theme="${brand}"]`, (rule) => {
        rule.walkDecls(foreground, (decl) => {
          correction = decl.value
        })
      })
      expect(correction).toBe("var(--color-fg-accent-primary)")
      expect(tokens(brand).get(foreground)).toBe(
        "var(--color-fg-accent-primary)"
      )
      for (const appearance of ["light", "dark"] as const) {
        expect(resolve(tokens(brand), foreground, appearance)).toBe(
          resolve(tokens(brand, false), foreground, appearance)
        )
      }
    }
  )

  it("keeps hover, pressed and disabled paint on their existing state tokens", () => {
    const classes = buttonVariants({ theme: "borderless" }).split(" ")
    expect(classes).toContain("text-button-fg-primary-borderless")
    expect(classes).toContain("hover:text-button-fg-interacting")
    expect(classes).toContain("active:text-button-fg-interacting")
    expect(classes).toContain("disabled:text-button-fg-disabled")
    for (const token of [
      "--color-button-fg-interacting",
      "--color-button-fg-disabled",
      "--color-button-bg-borderless-base",
      "--color-button-bg-borderless-hover",
      "--color-button-bg-borderless-active",
    ]) {
      foundation.walkDecls(token, () => {
        throw new Error(
          `Resting foreground correction must not change ${token}`
        )
      })
    }
  })
})
