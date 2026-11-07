// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { FormNumericInput } from "../src/molecules/form-numeric-input"
import { CallerOwnedError } from "../stories/molecules/form-numeric-input.stories"

function CallerErrorFixture() {
  if (!CallerOwnedError.render) {
    throw new Error("Missing caller-owned error fixture")
  }
  return CallerOwnedError.render({} as never, {} as never)
}

describe("FormNumericInput field layout", () => {
  it("allows the field to shrink without moving caller classes off the numeric root", () => {
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      <FormNumericInput
        className="consumer-numeric-root w-full"
        defaultValue={42}
        dir="rtl"
        helpText="Enter the quantity available for this delivery."
        ids={{ input: "order-quantity" }}
        label="Order quantity for the next scheduled delivery"
        required
      >
        <NumericInput.Control>
          <NumericInput.Input />
        </NumericInput.Control>
      </FormNumericInput>
    )
    const field = canvas.firstElementChild
    expect(field?.classList.contains("min-w-0")).toBe(true)
    expect(field?.classList.contains("gap-form-field-gap")).toBe(true)
    expect(field?.classList.contains("consumer-numeric-root")).toBe(false)
    const numericRoot = canvas.querySelector(".consumer-numeric-root")
    expect(numericRoot?.classList.contains("w-full")).toBe(true)
    expect(numericRoot?.getAttribute("dir")).toBe("rtl")
    const input = canvas.querySelector("input")
    expect(input?.id).toBe("order-quantity")
    expect(input?.required).toBe(true)
    expect(canvas.querySelector("label")?.htmlFor).toBe(input?.id)
    expect(canvas.querySelector("label")?.textContent).toContain(
      "Order quantity for the next scheduled delivery"
    )
    const helperId = input?.getAttribute("aria-describedby")
    expect(helperId).toBeTruthy()
    expect(canvas.querySelector('[data-status="default"]')?.id).toBe(helperId)
  })

  it("starts with a recognizably numeric error and preserves the caller error through clearing", async () => {
    const previousActEnvironment = Reflect.get(
      globalThis,
      "IS_REACT_ACT_ENVIRONMENT"
    )
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    try {
      await act(() => {
        root.render(<CallerErrorFixture />)
      })
      const input = canvas.querySelector("input")
      if (!input) {
        throw new Error("Missing quantity editor")
      }
      expect(input.value).toBe("42")
      expect(canvas.querySelector("label")?.textContent).toBe("Order quantity")
      expect(
        canvas.querySelector('[data-part="increment-trigger"]')
      ).not.toBeNull()
      expect(
        canvas.querySelector('[data-part="decrement-trigger"]')
      ).not.toBeNull()
      const errors = Array.from(canvas.querySelectorAll('[role="alert"]'))
      expect(errors).toHaveLength(2)
      const callerError = errors.find((error) =>
        error.textContent?.includes("Choose a quantity available in stock.")
      )
      if (!callerError) {
        throw new Error("Missing caller error")
      }
      const initialErrorIds = input
        .getAttribute("aria-errormessage")
        ?.split(" ")
      expect(initialErrorIds).toHaveLength(2)
      expect(initialErrorIds).toContain(callerError.id)
      expect(input.getAttribute("aria-invalid")).toBe("true")
      const clearField = Array.from(canvas.querySelectorAll("button")).find(
        (button) => button.textContent === "Clear field validation"
      )
      const clearCaller = Array.from(canvas.querySelectorAll("button")).find(
        (button) => button.textContent === "Clear caller error"
      )
      if (!(clearField && clearCaller)) {
        throw new Error("Missing error lifecycle controls")
      }
      await act(() => {
        clearField.click()
      })
      expect(input.getAttribute("aria-invalid")).toBe("true")
      expect(input.getAttribute("aria-errormessage")).toBe(callerError.id)
      expect(input.getAttribute("aria-describedby")).toBe(callerError.id)
      expect(canvas.querySelectorAll('[role="alert"]')).toHaveLength(1)
      await act(() => {
        clearCaller.click()
      })
      expect(input.hasAttribute("aria-errormessage")).toBe(false)
      expect(input.hasAttribute("aria-describedby")).toBe(false)
      expect(input.hasAttribute("aria-invalid")).toBe(false)
      expect(canvas.querySelectorAll('[role="alert"]')).toHaveLength(0)
      expect(input.value).toBe("42")
    } finally {
      await act(() => {
        root.unmount()
      })
      canvas.remove()
      Reflect.set(
        globalThis,
        "IS_REACT_ACT_ENVIRONMENT",
        previousActEnvironment
      )
    }
  })
})
