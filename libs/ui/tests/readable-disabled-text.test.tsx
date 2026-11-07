// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss from "postcss"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FormCheckbox } from "../src/molecules/form-checkbox"
import { Slider } from "../src/molecules/slider"
import { Switch } from "../src/molecules/switch"
import { FacetFilterPanel } from "../src/templates/facet-filter-panel"

const css = (file: string) =>
  postcss.parse(readFileSync(new URL(file, import.meta.url), "utf8"))
const exported = css("../src/tokens/figma/variables.css")
const brands = css("../src/tokens/figma/brand-overrides.css")
const business = css("../src/tokens/_business.css")
const foundation = css("../src/tokens/_foundation-overrides.css")
const slider = css("../src/tokens/components/molecules/_slider.css")
const switchTokens = css("../src/tokens/components/molecules/_switch.css")
const referencePattern = /^var\(\s*(--[\w-]+)\s*\)$/
const oklchPattern = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+|none)\)$/

function tokens(brand: string) {
  const values = new Map<string, string>()
  for (const sheet of [exported, slider, switchTokens, foundation]) {
    sheet.walkAtRules("theme", (rule) => {
      rule.walkDecls((decl) => {
        values.set(decl.prop, decl.value)
      })
    })
  }
  for (const sheet of [brands, foundation, business]) {
    sheet.walkRules(`[data-theme="${brand}"]`, (rule) => {
      rule.walkDecls((decl) => {
        values.set(decl.prop, decl.value)
      })
    })
  }
  return values
}

function resolve(
  values: Map<string, string>,
  name: string,
  appearance: "light" | "dark" = "light"
): string {
  let value = values.get(name)
  if (!value) {
    throw new Error(`Missing token ${name}`)
  }
  if (value.startsWith("light-dark(")) {
    value = value
      .slice(11, -1)
      .split(",")
      [appearance === "light" ? 0 : 1]?.trim()
    if (!value) {
      throw new Error(`Missing ${appearance} branch for ${name}`)
    }
  }
  const target = value.match(referencePattern)?.[1]
  return target ? resolve(values, target, appearance) : value
}

function luminance(color: string) {
  const match = color.match(oklchPattern)
  if (!match) {
    throw new Error(`Expected opaque OKLCH, got ${color}`)
  }
  const lightness = Number(match[1])
  const chroma = Number(match[2])
  const hue = ((match[3] === "none" ? 0 : Number(match[3])) * Math.PI) / 180
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

function contrastOnReportedSurface(foreground: string, background: number[]) {
  const [red = 0, green = 0, blue = 0] = background.map((channel) => {
    const value = channel / 255
    return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const surface = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  const text = luminance(foreground)
  return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05)
}

function render(node: ReactNode) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(node)
  return canvas
}

describe("readable disabled values and explanations", () => {
  it.each(["slider", "disabled", "pending"] as const)(
    "separates %s range values from quiet control labels without exempting output",
    (state) => {
      const canvas = render(
        state === "slider" ? (
          <Slider
            aria-label={["Minimum", "Maximum"]}
            defaultValue={[20, 80]}
            disabled
            label="Price"
            showValueText
          />
        ) : (
          <FacetFilterPanel
            {...{ [state]: true }}
            groups={[
              {
                type: "range",
                id: "price",
                label: "Price",
                min: 0,
                max: 100,
                value: [20, 80],
              },
            ]}
            title="Filters"
          />
        )
      )
      const output = canvas.querySelector("output")
      expect(output?.textContent?.trim()).toBe("20 – 80")
      expect(
        output?.classList.contains(
          "data-disabled:text-slider-value-fg-disabled"
        )
      ).toBe(true)
      expect(
        output?.classList.contains("data-disabled:text-label-fg-disabled")
      ).toBe(false)
      expect(output?.hasAttribute("data-disabled")).toBe(true)
      expect(
        output?.closest('[aria-disabled="true"], [aria-hidden="true"]')
      ).toBeNull()
      expect(
        canvas.querySelectorAll('[role="slider"][aria-disabled="true"]')
      ).toHaveLength(2)
      expect(
        canvas
          .querySelector('[data-scope="slider"][data-part="label"]')
          ?.classList.contains("text-label-fg-disabled")
      ).toBe(true)
    }
  )

  it("does not change readonly formatting, focusability or enabled value paint", () => {
    const canvas = render(
      <Slider
        aria-label={["Minimum", "Maximum"]}
        defaultValue={[20, 80]}
        formatRangeText={(values) => `$${values.join(" to $")}`}
        readOnly
        showValueText
      />
    )
    const output = canvas.querySelector("output")
    expect(output?.textContent?.trim()).toBe("$20 to $80")
    expect(output?.hasAttribute("data-disabled")).toBe(false)
    expect(output?.classList.contains("text-slider-value-fg-disabled")).toBe(
      false
    )
    for (const thumb of canvas.querySelectorAll('[role="slider"]')) {
      expect(thumb.getAttribute("aria-readonly")).toBe("true")
      expect(thumb.getAttribute("aria-disabled")).not.toBe("true")
      expect(thumb.getAttribute("tabindex")).toBe("0")
    }
  })

  it.each([false, true])(
    "leaves disabled checkbox explanations associated and exposed (indeterminate: %s)",
    (indeterminate) => {
      const canvas = render(
        <FormCheckbox
          disabled
          helpText="This setting is managed by your organization."
          indeterminate={indeterminate}
          label="Receive updates"
        />
      )
      const feedback = canvas.querySelector('[data-status="default"]')
      expect(feedback?.hasAttribute("data-disabled")).toBe(true)
      expect(feedback?.textContent).toBe(
        "This setting is managed by your organization."
      )
      expect(
        feedback?.closest('[aria-disabled="true"], [aria-hidden="true"]')
      ).toBeNull()
      expect(
        canvas.querySelector("input")?.getAttribute("aria-describedby")
      ).toBe(feedback?.id)
      expect(canvas.querySelector("input")?.disabled).toBe(true)
    }
  )

  it("rebinds only disabled feedback's legacy alias, honoring scoped StatusText overrides", () => {
    const values = tokens("business")
    let found = false
    foundation.walkRules("[data-status][data-disabled]", (rule) => {
      found = true
      expect(rule.nodes).toHaveLength(1)
      rule.walkDecls((decl) => {
        expect(decl.prop).toBe("--color-label-fg-disabled")
        expect(decl.value).toBe("var(--color-status-text-fg)")
        values.set(decl.prop, decl.value)
      })
    })
    expect(found).toBe(true)
    values.set("--color-status-text-fg", "scoped-feedback-foreground")
    expect(resolve(values, "--color-label-fg-disabled")).toBe(
      "scoped-feedback-foreground"
    )
    expect(tokens("business").get("--color-label-fg-disabled")).toBe(
      "var(--color-fg-disabled)"
    )
  })

  it("keeps disabled Switch explanations on a readable component alias", () => {
    const canvas = render(
      <Switch disabled helpText="Your administrator manages this preference.">
        Notifications
      </Switch>
    )
    const feedback = canvas.querySelector('[data-status="default"]')
    expect(feedback?.hasAttribute("data-disabled")).toBe(true)
    expect(
      feedback?.classList.contains(
        "data-disabled:data-[status=default]:text-switch-help-fg-disabled"
      )
    ).toBe(true)
    expect(feedback?.textContent).toBe(
      "Your administrator manages this preference."
    )
    const values = tokens("business")
    expect(resolve(values, "--color-switch-help-fg-disabled")).toBe(
      resolve(values, "--color-fg-secondary")
    )
    values.set("--color-switch-help-fg-disabled", "scoped-help-foreground")
    expect(resolve(values, "--color-switch-help-fg-disabled")).toBe(
      "scoped-help-foreground"
    )
  })

  it("keeps slider disabled paint on a caller-overridable component token", () => {
    const values = tokens("akros")
    expect(resolve(values, "--color-slider-value-fg-disabled")).toBe(
      resolve(values, "--color-fg-secondary")
    )
    values.set("--color-slider-value-fg-disabled", "scoped-slider-foreground")
    expect(resolve(values, "--color-slider-value-fg-disabled")).toBe(
      "scoped-slider-foreground"
    )
  })

  // Source-token regressions on CI's reported surfaces, not browser computed
  // colors. The parent must regenerate and validate nested scheme scopes.
  it.each([
    { brand: "business", appearance: "light", surface: [247, 249, 251] },
    { brand: "akros", appearance: "light", surface: [255, 255, 255] },
    { brand: "akros", appearance: "light", surface: [242, 243, 244] },
    { brand: "neo", appearance: "dark", surface: [3, 7, 18] },
  ] as const)(
    "provides normal-text contrast for $brand/$appearance on $surface",
    ({ brand, appearance, surface }) => {
      const values = tokens(brand)
      expect(
        contrastOnReportedSurface(
          resolve(values, "--color-label-fg-disabled", appearance),
          [...surface]
        )
      ).toBeLessThan(4.5)
      for (const token of [
        "--color-slider-value-fg-disabled",
        "--color-status-text-fg",
        "--color-switch-help-fg-disabled",
      ]) {
        expect(
          contrastOnReportedSurface(resolve(values, token, appearance), [
            ...surface,
          ])
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  )
})
