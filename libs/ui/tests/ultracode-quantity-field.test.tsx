// @vitest-environment happy-dom
import { act, type ComponentType, createRef, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  QuantityField,
  type QuantityFieldProps,
} from "../src/molecules/quantity-field"
import quantityMeta, {
  PendingAndReadOnly,
  States as QuantityStates,
} from "../stories/molecules/quantity-field.stories"
import { States as TemplateStates } from "../stories/templates/numeric-input.stories"

function markup(element: ReactNode) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(element)
  return canvas
}

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing quantity composition fixture")
  }
  return value
}

function quantityStory(story: typeof PendingAndReadOnly) {
  const Fixture = story.render as ComponentType<QuantityFieldProps>
  return markup(<Fixture {...(quantityMeta.args as QuantityFieldProps)} />)
}

const roots: Root[] = []
afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("QuantityField review compositions", () => {
  it.each([false, true])(
    "fills its host without depending on stepper intrinsic width (readOnly=%s)",
    (readOnly) => {
      const canvas = markup(
        <QuantityField
          label="Order quantity"
          onValueChange={vi.fn()}
          readOnly={readOnly}
          unitLabel="pieces"
          value="2"
        />
      )
      expect(canvas.firstElementChild?.classList.contains("w-full")).toBe(true)
      const input = required(canvas.querySelector("input"))
      expect(input.readOnly).toBe(readOnly)
      expect(input.disabled).toBe(false)
      expect(input.value).toBe("2")
      expect(canvas.querySelectorAll("button")).toHaveLength(readOnly ? 0 : 2)
      expect(canvas.querySelector("label")?.htmlFor).toBe(input.id)
      expect(
        input.closest('[data-part="root"]')?.classList.contains("flex-1")
      ).toBe(true)
    }
  )

  it("retains caller width overrides instead of forcing a fixed width", () => {
    const canvas = markup(
      <QuantityField
        className="w-fit"
        label="Order quantity"
        onValueChange={vi.fn()}
        unitLabel="pieces"
        value="2"
      />
    )
    expect(canvas.firstElementChild?.classList.contains("w-fit")).toBe(true)
    expect(canvas.firstElementChild?.classList.contains("w-full")).toBe(false)
  })

  it("gives every state the same host-filling root and preserves feedback", () => {
    const canvas = quantityStory(QuantityStates)
    const inputs = Array.from(canvas.querySelectorAll("input"))
    expect(inputs).toHaveLength(6)
    for (const input of inputs) {
      const numericRoot = required(input.closest('[data-part="root"]'))
      expect(
        numericRoot.parentElement?.parentElement?.classList.contains("w-full")
      ).toBe(true)
    }
    const status = required(canvas.querySelector('[role="status"]'))
    expect(status.textContent).toBe("Updating quantity")
    expect(status.getAttribute("aria-live")).toBe("polite")
    expect(canvas.textContent).toContain("Choose at most 10 pieces.")
    expect(inputs.filter((input) => input.disabled)).toHaveLength(2)
    expect(inputs.filter((input) => input.readOnly)).toHaveLength(1)
  })

  it("groups all draft and commit information separately from unequal-weight actions", () => {
    const canvas = quantityStory(PendingAndReadOnly)
    const status = required(
      canvas.querySelector('[data-testid="quantity-status"]')
    )
    expect(status.classList.contains("gap-100")).toBe(true)
    expect(status.parentElement?.classList.contains("gap-200")).toBe(true)
    expect(
      status.querySelector('[data-testid="draft-value"]')?.textContent
    ).toBe("Draft: 2")
    expect(
      status.querySelector('[data-testid="commit-count"]')?.textContent
    ).toBe("Commits: 0")
    expect(status.textContent).toContain("The demo does not save data.")
    const buttons = Array.from(canvas.querySelectorAll("button"))
    const pending = required(
      buttons.find((button) => button.textContent === "Toggle pending")
    )
    const readOnly = required(
      buttons.find((button) => button.textContent === "Toggle read only")
    )
    expect(pending.getAttribute("aria-pressed")).toBe("false")
    expect(readOnly.getAttribute("aria-pressed")).toBe("false")
    expect(readOnly.classList.contains("bg-button-bg-outlined")).toBe(true)
    expect(pending.classList.contains("bg-button-bg-outlined")).toBe(false)
    expect(readOnly.parentElement).toBe(pending.parentElement)
    expect(status.nextElementSibling).toBe(pending.parentElement)
  })

  it("keeps refs, native form identity, RTL and all description associations", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const ref = createRef<HTMLInputElement>()
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    roots.push(root)
    await act(() =>
      root.render(
        <form>
          <p id="external-help">Saved independently.</p>
          <QuantityField
            aria-describedby="external-help"
            describedBy="external-help"
            dir="rtl"
            error="Choose at most 10 pieces."
            helperText="Choose a quantity."
            id="quantity-review"
            label="Order quantity"
            name="quantity"
            onValueChange={vi.fn()}
            ref={ref}
            unitLabel="pieces"
            value="2"
          />
        </form>
      )
    )
    const input = required(canvas.querySelector("input"))
    expect(ref.current).toBe(input)
    expect(input.name).toBe("quantity")
    expect(input.form).toBe(canvas.querySelector("form"))
    expect(input.closest('[dir="rtl"]')).not.toBeNull()
    expect(input.getAttribute("aria-describedby")?.split(" ")).toEqual([
      "external-help",
      "quantity-review-unit",
      "quantity-review-helper",
      "quantity-review-error",
    ])
    expect(input.getAttribute("aria-errormessage")).toBe(
      "quantity-review-error"
    )
    expect(input.getAttribute("aria-invalid")).toBe("true")
    await act(() => ref.current?.focus())
    expect(document.activeElement).toBe(input)
  })
})

describe("NumericInputTemplate shared state guidance", () => {
  it("shows the limit hint once while retaining all six field names and their descriptions", () => {
    const Fixture = TemplateStates.render as ComponentType
    const canvas = markup(<Fixture />)
    const inputs = Array.from(canvas.querySelectorAll("input"))
    expect(inputs).toHaveLength(6)
    expect(
      Array.from(canvas.querySelectorAll("label"), (label) => label.textContent)
    ).toEqual([
      "Editable quantity",
      "Unavailable quantity",
      "Read-only quantity",
      "Invalid quantity",
      "Minimum quantity",
      "Maximum quantity",
    ])
    const hint = "Order 1–10 pieces; only the outward stepper stops at a limit."
    expect(canvas.textContent?.split(hint)).toHaveLength(2)
    const descriptions = inputs.map((input) => {
      const id = input.getAttribute("aria-describedby")
      return required(
        Array.from(canvas.querySelectorAll("[id]")).find(
          (node) => node.id === id
        )
      )
    })
    for (const index of [0, 1, 2, 4, 5]) {
      expect(descriptions[index]).toBe(descriptions[0])
      expect(descriptions[index]?.textContent).toBe(hint)
    }
    expect(descriptions[3]?.textContent).toContain(
      "Enter a quantity between 1 and 10 before ordering."
    )
    expect(inputs[3]?.getAttribute("aria-errormessage")).toBe(
      descriptions[3]?.id
    )
    expect(inputs[1]?.disabled).toBe(true)
    expect(inputs[2]?.readOnly).toBe(true)
  })
})
