// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"

function renderField(
  props: { density?: "default" | "compact"; size?: "sm" | "md" | "lg" } = {}
) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    <NumericInput defaultValue={1} id="quantity" {...props}>
      <NumericInput.Control>
        <NumericInput.Input aria-label="Quantity" />
        <NumericInput.TriggerContainer>
          <NumericInput.IncrementTrigger />
          <NumericInput.DecrementTrigger />
        </NumericInput.TriggerContainer>
      </NumericInput.Control>
    </NumericInput>
  )
  const control = canvas.querySelector<HTMLElement>('[data-part="control"]')
  const input = canvas.querySelector<HTMLInputElement>("input")
  const increment = canvas.querySelector<HTMLElement>(
    '[data-part="increment-trigger"]'
  )
  if (!(control && input && increment)) {
    throw new Error("Missing numeric input parts")
  }
  return { control, input, increment }
}

describe("NumericInput density", () => {
  it("keeps the default density on the form-control geometry", () => {
    const { control, input, increment } = renderField({ size: "md" })

    expect(control.classList).toContain("h-form-control-md")
    expect(control.classList).toContain("border-numeric-input-border")
    expect(control.classList).not.toContain("h-numeric-input-compact-md")
    expect(control.classList).not.toContain(
      "border-numeric-input-compact-border"
    )
    expect(input.classList).toContain("ps-numeric-input-input-md")
    expect(increment.classList).toContain("px-numeric-input-trigger-x")
    expect(increment.classList).not.toContain(
      "px-numeric-input-compact-trigger"
    )
  })

  it("renders the same classes when density is explicitly default", () => {
    const implicit = renderField({ size: "md" })
    const explicit = renderField({ density: "default", size: "md" })

    expect(explicit.control.className).toBe(implicit.control.className)
    expect(explicit.input.className).toBe(implicit.input.className)
    expect(explicit.increment.className).toBe(implicit.increment.className)
  })

  it("applies the compact height, padding and border to the field", () => {
    const { control, input, increment } = renderField({
      density: "compact",
      size: "md",
    })

    expect(control.classList).toContain("h-numeric-input-compact-md")
    expect(control.classList).toContain("border-numeric-input-compact-border")
    expect(control.classList).not.toContain("h-form-control-md")
    expect(control.classList).not.toContain("border-numeric-input-border")
    expect(input.classList).toContain("ps-numeric-input-compact-md")
    expect(input.classList).not.toContain("ps-numeric-input-input-md")
    expect(increment.classList).toContain("px-numeric-input-compact-trigger")
    expect(increment.classList).not.toContain("px-numeric-input-trigger-x")
  })

  it.each([
    ["sm", "h-numeric-input-compact-sm", "ps-numeric-input-compact-sm"],
    ["lg", "h-numeric-input-compact-lg", "ps-numeric-input-compact-lg"],
  ] as const)(
    "maps compact size %s to its own height and inline padding",
    (size, height, inlinePadding) => {
      const { control, input } = renderField({ density: "compact", size })

      expect(control.classList).toContain(height)
      expect(input.classList).toContain(inlinePadding)
    }
  )

  it("keeps compact sizing separate from the default size scale", () => {
    const { control } = renderField({ density: "compact", size: "sm" })

    expect(control.classList).not.toContain("h-form-control-sm")
  })
})
