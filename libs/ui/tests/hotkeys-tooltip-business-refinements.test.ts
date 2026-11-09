import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import tailwind from "@tailwindcss/postcss"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

// Focused regression for the two Business supporting-atom refinements in this lane:
//   - Hotkeys md stops collapsing onto the sm step, using the existing --text-base alias
//     while the raised sm midpoint and the shared lg step stay put.
//   - Tooltip gets the existing --shadow-lg elevation through the public
//     --shadow-tooltip alias, which the popup reads through the derived
//     --shadow-tooltip-surface token, leaving the shared --shadow-popup (and
//     therefore every other floating layer) alone.

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8")

const remLiteral = /^([\d.]+)rem$/

function aliases(css: string) {
  const values = new Map<string, string>()
  postcss.parse(css).walkDecls((decl) => {
    values.set(decl.prop, decl.value)
  })
  return values
}

function businessScope(css: string) {
  const values = new Map<string, string>()
  postcss.parse(css).walkAtRules("scope", (rule) => {
    if (!rule.params.includes('[data-theme="business"]')) {
      return
    }
    rule.walkDecls((decl) => {
      values.set(decl.prop, decl.value)
    })
  })
  return values
}

/** Reads the `rem` number out of a literal reference token such as `0.88rem`. */
function rem(value: string | undefined, name: string) {
  const match = value?.trim().match(remLiteral)
  if (!match) {
    throw new Error(`Expected ${name} to be a rem literal, received ${value}`)
  }
  return Number(match[1])
}

const business = aliases(read("../src/tokens/_business-atoms.css"))
const atoms = aliases(read("../src/tokens/components/atoms/_hotkeys.css"))
const tooltipAtoms = aliases(
  read("../src/tokens/components/atoms/_tooltip.css")
)
const runtime = aliases(read("../src/tokens/figma/variables.css"))
const scopes = businessScope(read("../src/tokens/_scheme-scopes.css"))

describe("Business Hotkeys scale", () => {
  it("moves the Business medium keycap onto the existing base alias", () => {
    expect(business.get("--text-hotkeys-md")).toBe("var(--text-base)")
  })

  it("keeps the raised Business small midpoint and the shared large step", () => {
    expect(business.get("--text-hotkeys-sm")).toBe(
      "calc((var(--text-xs) + var(--text-sm)) / 2)"
    )
    expect(atoms.get("--text-hotkeys-sm")).toBe("var(--text-xs)")
    expect(atoms.get("--text-hotkeys-lg")).toBe("var(--text-md)")
    expect(business.has("--text-hotkeys-lg")).toBe(false)
  })

  it("resolves to a strictly ordered sm < md < lg keycap scale", () => {
    const xs = rem(runtime.get("--text-xs"), "--text-xs")
    const sm = rem(runtime.get("--text-sm"), "--text-sm")
    const base = rem(runtime.get("--text-base"), "--text-base")
    const md = rem(runtime.get("--text-md"), "--text-md")

    const businessSm = (xs + sm) / 2
    const businessMd = base
    const businessLg = md

    expect(businessSm).toBeLessThan(businessMd)
    expect(businessMd).toBeLessThan(businessLg)
    expect(businessMd).not.toBe(businessLg)
    expect(businessMd).toBeGreaterThan(
      rem(runtime.get("--text-sm"), "--text-sm")
    )
  })
})

describe("Business Tooltip elevation", () => {
  it("gives the Business popup the existing large elevation through --shadow-tooltip", () => {
    expect(business.get("--shadow-tooltip")).toBe("var(--shadow-lg)")
    expect(runtime.has("--shadow-lg")).toBe(true)
  })

  it("leaves the shared popup shadow and every other floating layer untouched", () => {
    expect(business.has("--shadow-popup")).toBe(false)
    expect(business.has("--shadow-popover")).toBe(false)
    expect(business.has("--shadow-menu-content")).toBe(false)
    expect(runtime.get("--shadow-popup")).toBe("var(--shadow-md)")
    expect(tooltipAtoms.get("--shadow-tooltip")).toBe("var(--shadow-popup)")
    expect(tooltipAtoms.get("--shadow-tooltip-surface")).toBe(
      "var(--shadow-tooltip)"
    )
  })
})

describe("Business refinement wiring", () => {
  it("keeps the generated Business scheme scope in sync with the authored aliases", () => {
    expect(scopes.get("--text-hotkeys-md")).toBe("var(--text-base)")
    expect(scopes.get("--text-hotkeys-sm")).toBe(
      "calc((var(--text-xs) + var(--text-sm)) / 2)"
    )
    expect(scopes.get("--shadow-tooltip")).toBe("var(--shadow-lg)")
  })

  it("leaves the Hotkeys and Tooltip class contracts and props unchanged", () => {
    const hotkeys = read("../src/atoms/hotkeys.tsx")
    const tooltip = read("../src/atoms/tooltip.tsx")

    for (const size of ["sm", "md", "lg"]) {
      expect(hotkeys).toContain(`text-hotkeys-${size}`)
    }
    expect(tooltip).toContain('"shadow-tooltip-surface"')
    expect(tooltip).toContain('"bg-tooltip-bg"')
    expect(tooltip).toContain('"rounded-tooltip"')
    expect(tooltip).toContain('"tooltip-surface"')
    expect(tooltip).not.toContain("shadow-popup")
    expect(tooltip).not.toContain("shadow-lg")
    expect(tooltip).not.toContain("shadow-[")
  })
})

const twShadowDeclaration = /--tw-shadow: ([^;}]+)/

/**
 * The `--tw-shadow` value emitted for one class selector. Each selector carries
 * a single declaration, so the first match is the one the cascade uses.
 */
function emittedShadow(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const rule = css.match(new RegExp(`${escaped} \\{[^}]*\\}`))?.[0] ?? ""
  return rule.match(twShadowDeclaration)?.[1]?.trim()
}

const require = createRequire(import.meta.url)

/**
 * Compiles the real tooltip token CSS with the installed Tailwind toolchain.
 *
 * Authored aliases can be correct while the shipped class still ignores them:
 * Tailwind's `--shadow-*` namespace copies a theme value into `--tw-shadow` at
 * build time, so a `shadow-tooltip` utility compiles to `var(--shadow-popup)`
 * and freezes the elevation. The popup reads `shadow-tooltip-surface` instead,
 * because that theme value is the public alias itself. Asserting the emitted
 * cascade is the only way to catch a regression here.
 */
async function compileTooltipElevation(classes: string) {
  const tooltipCss = fileURLToPath(
    new URL("../src/tokens/components/atoms/_tooltip.css", import.meta.url)
  )
  const businessCss = fileURLToPath(
    new URL("../src/tokens/_business-atoms.css", import.meta.url)
  )
  const source = [
    `@import "${require.resolve("tailwindcss/index.css")}";`,
    `@import "${tooltipCss}";`,
    `@import "${businessCss}";`,
    `@source inline("${classes}");`,
  ].join("\n")
  const result = await postcss([tailwind()]).process(source, {
    from: tooltipCss,
  })
  return result.css.replace(/\s+/g, " ")
}

const emittedCss = new Map<string, Promise<string>>()
function emitted(classes = "shadow-tooltip-surface") {
  const cached = emittedCss.get(classes)
  if (cached) {
    return cached
  }
  const compiled = compileTooltipElevation(classes)
  emittedCss.set(classes, compiled)
  return compiled
}

const shadowTooltipSurfaceRule = /\.shadow-tooltip-surface \{[^}]*\}/

describe("Business Tooltip elevation in the emitted CSS", () => {
  it("ships a shadow-tooltip-surface class that reads the runtime alias", async () => {
    // This is what makes both overrides work: the popup resolves
    // `--shadow-tooltip` at use time, so Business can raise it and a caller can
    // replace it on the open popup without touching `--shadow-popup`.
    const declaration = emittedShadow(
      await emitted(),
      ".shadow-tooltip-surface"
    )
    expect(declaration).toBe("var(--shadow-tooltip)")
  })

  it("keeps the shared popup elevation as the default and Business on the large one", async () => {
    const css = await emitted()
    expect(css).toContain("--shadow-tooltip: var(--shadow-popup)")
    expect(css).toContain("--shadow-tooltip: var(--shadow-lg)")
    expect(css).toContain("--shadow-tooltip-surface: var(--shadow-tooltip)")
  })

  it("keeps the built-in shadow and ring composition", async () => {
    const rule = (await emitted()).match(shadowTooltipSurfaceRule)?.[0] ?? ""
    for (const variable of [
      "--tw-inset-shadow",
      "--tw-inset-ring-shadow",
      "--tw-ring-offset-shadow",
      "--tw-ring-shadow",
      "--tw-shadow",
    ]) {
      expect(rule).toContain(`var(${variable})`)
    }
  })

  it("ships no important declaration on the tooltip shadow utilities", async () => {
    const css = await emitted("shadow-tooltip shadow-tooltip-surface")
    const rules = css.match(/\.shadow-tooltip[^{]*\{[^}]*\}/g) ?? []
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule).not.toContain("!important")
    }
  })
})

describe("caller shadow utilities on the Tooltip popup", () => {
  const callerClasses =
    "shadow-tooltip-surface hover:shadow-none focus:shadow-lg"

  it("emits ordinary hover and focus variants that replace --tw-shadow", async () => {
    const css = await emitted(callerClasses)
    expect(emittedShadow(css, ".hover\\:shadow-none:hover")).toBe("0 0 #0000")
    const focus = emittedShadow(css, ".focus\\:shadow-lg:focus")
    expect(focus).toBeDefined()
    expect(focus).not.toBe("var(--shadow-tooltip)")
  })

  it("keeps the variants after the base utility so a caller override wins", async () => {
    const css = await emitted(callerClasses)
    const base = css.indexOf(".shadow-tooltip-surface {")
    expect(base).toBeGreaterThanOrEqual(0)
    // No important declaration sits on the base utility (asserted above), so the
    // later, more specific variant declaration takes over instead of losing.
    expect(css.indexOf(".hover\\:shadow-none:hover {")).toBeGreaterThan(base)
    expect(css.indexOf(".focus\\:shadow-lg:focus {")).toBeGreaterThan(base)
  })
})
