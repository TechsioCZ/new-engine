// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Checkbox } from "../src/atoms/checkbox"
import { NumericInput } from "../src/atoms/numeric-input"

const requireElement = (markup: string, selector: string): HTMLElement => {
  const document = new DOMParser().parseFromString(markup, "text/html")
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected rendered markup to contain ${selector}.`)
  }
  return element
}

const renderNumericInputControl = (invalid: boolean): HTMLElement =>
  requireElement(
    renderToStaticMarkup(
      <NumericInput invalid={invalid}>
        <NumericInput.Control>
          <NumericInput.Input />
        </NumericInput.Control>
      </NumericInput>,
    ),
    '[data-scope="number-input"][data-part="control"]',
  )

describe("invalid state attributes", () => {
  it("omits false invalid state from checkbox presence selectors", () => {
    const checkbox = requireElement(
      renderToStaticMarkup(<Checkbox invalid={false} />),
      'input[type="checkbox"]',
    )

    expect(checkbox.getAttribute("aria-invalid")).toBeNull()
    expect(checkbox.dataset["invalid"]).toBeUndefined()
  })

  it("emits true invalid state for checkbox presence selectors", () => {
    const checkbox = requireElement(
      renderToStaticMarkup(<Checkbox invalid />),
      'input[type="checkbox"]',
    )

    expect(checkbox.getAttribute("aria-invalid")).toBe("true")
    expect(checkbox.dataset["invalid"]).toBe("true")
  })

  it("omits false invalid state from numeric-input presence selectors", () => {
    expect(renderNumericInputControl(false).dataset["invalid"]).toBeUndefined()
  })

  it("emits true invalid state for numeric-input presence selectors", () => {
    expect(renderNumericInputControl(true).dataset["invalid"]).toBe("true")
  })
})
