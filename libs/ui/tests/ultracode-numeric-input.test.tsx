// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  NumericInput,
  type NumericInputProps,
} from "../src/atoms/numeric-input"

function fixture({
  rootProps = {},
  inputClassName,
  triggerContainerClassName,
  triggerClassName,
}: {
  rootProps?: NumericInputProps
  inputClassName?: string
  triggerContainerClassName?: string
  triggerClassName?: string
} = {}) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    <NumericInput defaultValue={10} id="compact-quantity" {...rootProps}>
      <NumericInput.Control>
        <NumericInput.Input aria-label="Quantity" className={inputClassName} />
        <NumericInput.TriggerContainer
          className={triggerContainerClassName}
          data-testid="steppers"
        >
          <NumericInput.IncrementTrigger
            aria-label="Increase quantity"
            className={triggerClassName}
          />
          <NumericInput.DecrementTrigger
            aria-label="Decrease quantity"
            className={triggerClassName}
          />
        </NumericInput.TriggerContainer>
      </NumericInput.Control>
    </NumericInput>
  )
  const root = canvas.querySelector<HTMLElement>('[data-part="root"]')
  const input = canvas.querySelector("input")
  if (!(root && input)) {
    throw new Error("Missing numeric field")
  }
  return {
    root,
    input,
    steppers: canvas.querySelector<HTMLElement>('[data-testid="steppers"]'),
    buttons: Array.from(canvas.querySelectorAll("button")),
  }
}

describe("NumericInput compact field layout", () => {
  it.each(["sm", "md", "lg"] as const)(
    "lets the %s editor shrink while preserving stepper space and touch sizing",
    (size) => {
      const { root, input, steppers, buttons } = fixture({
        rootProps: { size },
      })
      expect(root.classList.contains("min-w-0")).toBe(true)
      expect(input.classList.contains("min-w-0")).toBe(true)
      expect(input.classList.contains("flex-1")).toBe(true)
      expect(input.classList.contains("h-full")).toBe(true)
      expect(steppers?.classList.contains("shrink-0")).toBe(true)
      expect(steppers?.classList.contains("self-stretch")).toBe(true)
      expect(buttons).toHaveLength(2)
      for (const button of buttons) {
        expect(
          button.classList.contains(
            "pointer-coarse:min-w-numeric-input-trigger-touch-min"
          )
        ).toBe(true)
        expect(
          button.classList.contains("min-w-numeric-input-trigger-min")
        ).toBe(true)
        expect(
          button.classList.contains(`numeric-input-trigger-icon-${size}`)
        ).toBe(true)
      }
    }
  )

  it("keeps consumer sizing overrides authoritative", () => {
    const { root, input, steppers, buttons } = fixture({
      rootProps: { className: "min-w-full" },
      inputClassName: "min-w-full flex-none",
      triggerContainerClassName: "shrink",
      triggerClassName: "pointer-coarse:min-w-0",
    })
    expect(root.classList.contains("min-w-full")).toBe(true)
    expect(root.classList.contains("min-w-0")).toBe(false)
    expect(input.classList.contains("min-w-full")).toBe(true)
    expect(input.classList.contains("flex-none")).toBe(true)
    expect(input.classList.contains("min-w-0")).toBe(false)
    expect(input.classList.contains("flex-1")).toBe(false)
    expect(steppers?.classList.contains("shrink")).toBe(true)
    expect(steppers?.classList.contains("shrink-0")).toBe(false)
    for (const button of buttons) {
      expect(button.classList.contains("pointer-coarse:min-w-0")).toBe(true)
      expect(
        button.classList.contains(
          "pointer-coarse:min-w-numeric-input-trigger-touch-min"
        )
      ).toBe(false)
    }
  })

  it("preserves RTL direction, logical dividers and adjustment names", () => {
    const { root, input, steppers, buttons } = fixture({
      rootProps: { dir: "rtl" },
    })
    expect(root.getAttribute("dir")).toBe("rtl")
    expect(steppers?.classList.contains("border-s")).toBe(true)
    expect(input.getAttribute("aria-label")).toBe("Quantity")
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Increase quantity",
      "Decrease quantity",
    ])
  })

  it("retains the full-width editor without steppers in read-only mode", () => {
    const { input, steppers, buttons } = fixture({
      rootProps: { readOnly: true },
    })
    expect(input.readOnly).toBe(true)
    expect(input.disabled).toBe(false)
    expect(input.classList.contains("flex-1")).toBe(true)
    expect(steppers).toBeNull()
    expect(buttons).toHaveLength(0)
  })

  it("keeps disabled field and adjustment controls disabled", () => {
    const { input, buttons } = fixture({ rootProps: { disabled: true } })
    expect(input.disabled).toBe(true)
    expect(buttons).toHaveLength(2)
    expect(buttons.every((button) => button.disabled)).toBe(true)
  })
})
