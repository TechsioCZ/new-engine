import { readFileSync } from "node:fs"
import postcss, { type AtRule, type Declaration, type Rule } from "postcss"
import { type ComponentType, createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  PhoneInput,
  type PhoneInputCountry,
  phoneInputVariants,
} from "../src/molecules/phone-input"
import { AccessibleCountryNames } from "../stories/molecules/phone-input.stories"

const countries: PhoneInputCountry[] = [
  { value: "SK", label: "Slovakia" },
  { value: "CZ", label: "Czechia" },
  { value: "PL", label: "Poland", disabled: true },
]
const disabledCountryMarkup =
  /<li\b[^>]*data-testid="disabled-country"[^>]*>[\s\S]*?<\/li>/
const telephoneMarkup = /<input\b[^>]*type="tel"[^>]*>/
const hiddenTelephoneMarkup =
  /<input\b(?=[^>]*\sname="phone")(?=[^>]*\stype="hidden")(?=[^>]*\svalue="\+421900123456")[^>]*>/
const metadataMarkup = /<span\b[^>]*data-testid="country-code"[^>]*>/
const fullWidthExternalLabel =
  /<div class="grid w-full min-w-0 max-w-sm gap-100"><span[^>]*>Country for billing phone<\/span>/

function renderPhone() {
  return renderToStaticMarkup(
    h(
      PhoneInput,
      {
        countries,
        defaultCountry: "SK",
        defaultValue: "+421900123456",
        name: "phone",
      },
      h(PhoneInput.Label, null, "Delivery phone"),
      h(
        PhoneInput.Control,
        null,
        h(
          PhoneInput.CountrySelect,
          null,
          h(PhoneInput.CountryControl, null, h(PhoneInput.CountryTrigger)),
          // Render the list without a portal so SSR can check real Zag item state.
          h(
            PhoneInput.CountryContent,
            null,
            ...countries.map((item) => (
              <PhoneInput.CountryItem
                data-testid={item.disabled ? "disabled-country" : undefined}
                item={item}
                key={item.value}
              >
                <PhoneInput.CountryItemText />
                <PhoneInput.CountryItemMeta data-testid="country-code" />
              </PhoneInput.CountryItem>
            ))
          )
        ),
        h(PhoneInput.Input)
      )
    )
  )
}

// Static contracts only; the parent must run browser paint/layout checks.
describe("PhoneInput presentation regressions", () => {
  it("inherits disabled row color without losing selected and highlighted metadata states", () => {
    const css = postcss.parse(
      readFileSync(
        new URL(
          "../src/tokens/components/molecules/_phone-input.css",
          import.meta.url
        ),
        "utf8"
      )
    )
    const utility = css.nodes.find(
      (node): node is AtRule =>
        node.type === "atrule" &&
        node.name === "utility" &&
        node.params === "phone-input-item-meta"
    )
    expect(utility).toBeDefined()
    const stateRule = utility?.nodes?.find(
      (node): node is Rule =>
        node.type === "rule" && node.selector.includes('[data-part="item"]')
    )
    expect(stateRule?.selector).toContain("[data-disabled]")
    expect(stateRule?.selector).toContain('[data-state="checked"]')
    expect(stateRule?.selector).toContain("[data-highlighted]")
    const declarations = Object.fromEntries(
      (stateRule?.nodes ?? [])
        .filter((node): node is Declaration => node.type === "decl")
        .map((node) => [node.prop, node.value])
    )
    expect(declarations).toEqual({ color: "inherit" })
    expect(phoneInputVariants().itemMeta()).toContain(
      "text-phone-input-item-meta-fg"
    )
    expect(
      phoneInputVariants().itemMeta({ className: "text-inherit" })
    ).toContain("text-inherit")
  })

  it("keeps disabled country semantics and visible code alongside the unchanged native phone value", () => {
    const html = renderPhone()
    const disabledCountry = html.match(disabledCountryMarkup)?.[0] ?? ""
    expect(disabledCountry).toContain('role="option"')
    expect(disabledCountry).toContain('data-disabled=""')
    expect(disabledCountry).toContain('aria-disabled="true"')
    expect(disabledCountry).toContain("Poland")
    expect(disabledCountry).toContain("+48")
    expect(disabledCountry.match(metadataMarkup)?.[0]).toContain(
      "phone-input-item-meta"
    )
    expect(html).toContain('aria-label="Slovakia (+421)"')
    expect(html.match(telephoneMarkup)?.[0]).toContain('value="900 123 456"')
    expect(html).toMatch(hiddenTelephoneMarkup)
  })

  it("gives the external-label example the same responsive field width and retains both labels", () => {
    const Example = AccessibleCountryNames.render as ComponentType
    const html = renderToStaticMarkup(h(Example))
    expect(html).toMatch(fullWidthExternalLabel)
    expect(html).toContain("Billing phone")
    expect(html).toContain('aria-label="Country for support phone"')
    expect(html).toContain("Delivery phone")
    expect(html).toContain("Localized phone")
    expect(html).toContain("Support phone")
  })
})
