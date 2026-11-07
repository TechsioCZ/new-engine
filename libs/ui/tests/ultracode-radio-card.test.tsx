import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { RadioCard, radioCardVariants } from "../src/molecules/radio-card"

const TOKEN_REFERENCE = /^var\(\s*(--[\w-]+)\s*\)$/
const DESCRIPTION_TAG = /<div\b[^>]*data-part="item-description"[^>]*>/
const ADDON_TAG = /<div\b[^>]*data-part="item-addon"[^>]*>/

function tokens() {
  const values = new Map<string, string>()
  postcss
    .parse(
      readFileSync(
        new URL(
          "../src/tokens/components/molecules/_radio-card.css",
          import.meta.url
        ),
        "utf8"
      )
    )
    .walkDecls((declaration) => {
      if (declaration.prop.startsWith("--")) {
        values.set(declaration.prop, declaration.value)
      }
    })
  return values
}

function resolve(
  values: Map<string, string>,
  name: string
): string | undefined {
  const value = values.get(name)
  const target = value?.match(TOKEN_REFERENCE)?.[1]
  return target ? resolve(values, target) : value
}

// SSR/token contracts only; focus paint and contrast still need browser checks.
describe("RadioCard compact supporting text and selected footer overrides", () => {
  it("keeps compact descriptions and prices on the readable small text step", () => {
    const values = tokens()
    values.set("--text-sm", "0.875rem")
    values.set("--text-xs", "0.75rem")
    expect(resolve(values, "--text-radio-card-item-description-sm")).toBe(
      "0.875rem"
    )
    expect(resolve(values, "--text-radio-card-addon-sm")).toBe("0.875rem")
    const styles = radioCardVariants({ size: "sm" })
    expect(styles.itemDescription()).toContain(
      "text-radio-card-item-description-sm"
    )
    expect(styles.itemAddon()).toContain("text-radio-card-addon-sm")
  })

  it("retains independent compact description and price overrides", () => {
    const values = tokens()
    values.set("--text-radio-card-supporting-sm", "1rem")
    values.set("--text-radio-card-addon-sm", "1.125rem")
    expect(resolve(values, "--text-radio-card-item-description-sm")).toBe(
      "1rem"
    )
    expect(resolve(values, "--text-radio-card-addon-sm")).toBe("1.125rem")
  })

  it.each(["subtle", "solid"] as const)(
    "uses the %s footer token without changing the readable default",
    (variant) => {
      const values = tokens()
      const inherited =
        variant === "subtle"
          ? "--color-radio-card-fg-choice-selected"
          : "--color-radio-card-item-fg-solid-checked"
      const footer = `--color-radio-card-addon-fg-${variant}-checked`
      values.set(inherited, "rgb(21, 37, 53)")
      expect(resolve(values, footer)).toBe("rgb(21, 37, 53)")
      values.set(footer, "rgb(65, 81, 97)")
      expect(resolve(values, footer)).toBe("rgb(65, 81, 97)")
      expect(resolve(values, inherited)).toBe("rgb(21, 37, 53)")

      const classes = radioCardVariants({ variant }).itemAddon()
      expect(classes).toContain(
        `data-[state=checked]:text-radio-card-addon-fg-${variant}-checked`
      )
      expect(classes).toContain(
        "data-disabled:data-[state=checked]:text-radio-card-addon-fg-disabled"
      )
      const custom = "data-[state=checked]:text-radio-card-addon-fg"
      const overridden = radioCardVariants({ variant }).itemAddon({
        className: custom,
      })
      expect(overridden.split(" ")).toContain(custom)
      expect(overridden).not.toContain(
        `data-[state=checked]:text-radio-card-addon-fg-${variant}-checked`
      )
    }
  )

  it("keeps full option content and native values in a compact selected card", () => {
    const description = "Available after the store confirms your order."
    const html = renderToStaticMarkup(
      <RadioCard
        aria-label="Delivery method"
        defaultValue="pickup"
        name="delivery"
        size="sm"
        variant="subtle"
      >
        <RadioCard.Item value="pickup">
          <RadioCard.ItemHiddenInput />
          <RadioCard.ItemControl>
            <RadioCard.ItemContent>
              <RadioCard.ItemText>Store pickup</RadioCard.ItemText>
              <RadioCard.ItemDescription>
                {description}
              </RadioCard.ItemDescription>
            </RadioCard.ItemContent>
            <RadioCard.ItemIndicator />
          </RadioCard.ItemControl>
          <RadioCard.ItemAddon>Free</RadioCard.ItemAddon>
        </RadioCard.Item>
      </RadioCard>
    )
    expect(html).toContain(description)
    expect(html).toContain("Store pickup")
    expect(html).toContain("Free")
    expect(html).toContain('name="delivery"')
    expect(html).toContain('value="pickup"')
    expect(html).toContain('checked=""')
    expect(html.match(DESCRIPTION_TAG)?.[0]).toContain('data-state="checked"')
    expect(html.match(ADDON_TAG)?.[0]).toContain('data-state="checked"')
  })
})
