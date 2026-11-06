import { type ComponentType, createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ResetOwnership } from "../stories/molecules/phone-input.stories"

const formMarkup = /<form\b[\s\S]*?<\/form>/g
const labelMarkup = /<label\b[^>]*for="([^"]+)"[^>]*>([^<]+)<\/label>/
const inputMarkup = /<input\b[^>]*>/g
const controlMarkup = /<div\b[^>]*data-testid="reset-phone-control"[^>]*>/

const renderForms = () => {
  const Example = ResetOwnership.render as ComponentType
  return renderToStaticMarkup(h(Example)).match(formMarkup) ?? []
}

describe("PhoneInput reset ownership story", () => {
  it("renders an explicit phone-control hook for every ownership combination", () => {
    const forms = renderForms()
    expect(forms).toHaveLength(4)
    for (const form of forms) {
      // PhoneInput.Control is not a Zag part and has no data-part attribute.
      expect(form).toMatch(controlMarkup)
      expect(form.match(controlMarkup)?.[0]).not.toContain(
        'data-part="control"'
      )
      const controlStart = form.search(controlMarkup)
      const inputStart = form.indexOf('type="tel"')
      expect(controlStart).toBeLessThan(inputStart)
    }
  })

  it("retains native submission and accessible labels for all four reset forms", () => {
    const forms = renderForms()
    const labels = [false, true].flatMap((controlValue) =>
      [false, true].map(
        (controlCountry) =>
          `Reset ${controlValue ? "controlled" : "default"} value / ${controlCountry ? "controlled" : "default"} country`
      )
    )
    expect(forms).toHaveLength(labels.length)
    for (const [index, form] of forms.entries()) {
      const label = form.match(labelMarkup)
      expect(label?.[2]).toBe(labels[index])
      const inputs = form.match(inputMarkup) ?? []
      const input = inputs.find((tag) => tag.includes('type="tel"')) ?? ""
      expect(input).toContain(`id="${label?.[1]}"`)
      expect(input).toContain('value="900 123 456"')
      const nativeInput =
        inputs.find((tag) => tag.includes('name="phone"')) ?? ""
      expect(nativeInput).toContain('type="hidden"')
      expect(nativeInput).toContain('value="+421900123456"')
      expect(form).toContain(`type="reset">${labels[index]}</button>`)
      expect(form).not.toContain("Reset Reset")
      expect(form).toContain('aria-label="Slovakia (+421)"')
      expect(form).toContain("Use a number we can reach for delivery updates.")
    }
  })
})
