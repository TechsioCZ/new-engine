// @vitest-environment happy-dom
import { notStrictEqual, ok, strictEqual } from "node:assert/strict"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RadioCard, type RadioCardProps } from "../src/molecules/radio-card"

// DOM contracts only: this suite does not claim to measure utility-CSS paint,
// contrast, focus outlines or mobile/RTL geometry in a DOM emulator.
const roots: Root[] = []
const options = [
  {
    value: "standard",
    label: "Standard delivery",
    description: "Arrives in 3–5 business days.",
    price: "Free",
  },
  {
    value: "express",
    label: "Express delivery",
    description: "Arrives the next business day.",
    price: "€8.90",
  },
]
const variants = ["outline", "subtle", "solid"] as const
const stateParts = [
  "item-control",
  "item-text",
  "item-description",
  "item-addon",
  "item-indicator",
] as const

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing RadioCard contract fixture")
  }
  return value
}

async function mount(children: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  const render = async (next: ReactNode) => {
    await act(() => root.render(next))
  }
  await render(children)
  return { canvas, render }
}

function DeliveryChoices(props: Omit<RadioCardProps, "children">) {
  return (
    <form>
      <RadioCard name="delivery" {...props}>
        <RadioCard.Label>Delivery method</RadioCard.Label>
        {options.map((option) => (
          <RadioCard.Item key={option.value} value={option.value}>
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RadioCard.ItemText>{option.label}</RadioCard.ItemText>
                <RadioCard.ItemDescription>
                  {option.description}
                </RadioCard.ItemDescription>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
            <RadioCard.ItemAddon>{option.price}</RadioCard.ItemAddon>
          </RadioCard.Item>
        ))}
      </RadioCard>
    </form>
  )
}

function expectSelection(canvas: HTMLElement, value: string | null) {
  const items = canvas.querySelectorAll<HTMLElement>('[data-part="item"]')
  strictEqual(items.length, options.length)
  strictEqual(
    canvas.querySelectorAll('input[type="radio"]:checked').length,
    value === null ? 0 : 1
  )
  for (const item of items) {
    const input = required(
      item.querySelector<HTMLInputElement>('input[type="radio"]')
    )
    const selected = input.value === value
    const state = selected ? "checked" : "unchecked"
    strictEqual(input.checked, selected)
    strictEqual(item.getAttribute("data-state"), state)
    for (const part of stateParts) {
      strictEqual(
        required(item.querySelector(`[data-part="${part}"]`)).getAttribute(
          "data-state"
        ),
        state
      )
    }
    const indicator = required(
      item.querySelector('[data-part="item-indicator"]')
    )
    strictEqual(
      required(indicator.firstElementChild).getAttribute("data-state"),
      state
    )
    strictEqual(indicator.getAttribute("aria-hidden"), "true")
    const describedBy = input.getAttribute("aria-describedby")?.split(" ") ?? []
    for (const part of ["item-description", "item-addon"]) {
      const description = required(
        item.querySelector<HTMLElement>(`[data-part="${part}"]`)
      )
      notStrictEqual(description.id, "")
      ok(describedBy.includes(description.id))
      strictEqual(document.getElementById(description.id), description)
    }
  }
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("RadioCard selected-state projection", () => {
  for (const dir of ["ltr", "rtl"] as const) {
    it.each(variants)(
      `projects parent changes and clearing to every %s member in ${dir}`,
      async (variant) => {
        const onValueChange = vi.fn()
        const view = (value: string | null) => (
          <DeliveryChoices
            dir={dir}
            onValueChange={onValueChange}
            size="sm"
            value={value}
            variant={variant}
          />
        )
        const { canvas, render } = await mount(view("standard"))
        const firstInput = required(
          canvas.querySelector('input[value="standard"]')
        )
        const form = required(canvas.querySelector("form"))
        const group = required(
          canvas.querySelector<HTMLElement>('[role="radiogroup"]')
        )
        expect(group.dir).toBe(dir)
        for (const value of ["standard", "express", null, "standard"]) {
          await render(view(value))
          await vi.waitFor(() => {
            expectSelection(canvas, value)
            expect(new FormData(form).getAll("delivery")).toEqual(
              value === null ? [] : [value]
            )
          })
          // Exercise updates of the existing machine, not a freshly mounted fixture.
          expect(canvas.querySelector('input[value="standard"]')).toBe(
            firstInput
          )
          expect(onValueChange).not.toHaveBeenCalled()
        }
      }
    )
  }

  it.each(["readOnly", "disabled"] as const)(
    "retains selected compound state when the parent toggles %s",
    async (mode) => {
      const onValueChange = vi.fn()
      const view = (active: boolean) => (
        <DeliveryChoices
          {...{ [mode]: active }}
          onValueChange={onValueChange}
          value="express"
          variant="solid"
        />
      )
      const { canvas, render } = await mount(view(false))
      const form = required(canvas.querySelector("form"))
      for (const active of [true, false]) {
        await render(view(active))
        await vi.waitFor(() => {
          expectSelection(canvas, "express")
          const disabled = mode === "disabled" && active
          for (const input of canvas.querySelectorAll<HTMLInputElement>(
            'input[type="radio"]'
          )) {
            expect(input.disabled).toBe(disabled)
            expect(input.readOnly).toBe(mode === "readOnly" && active)
          }
          for (const member of canvas.querySelectorAll(
            '[data-part="item"], [data-part="item-description"], [data-part="item-addon"], [data-part="item-indicator"]'
          )) {
            expect(member.hasAttribute("data-disabled")).toBe(disabled)
          }
          expect(new FormData(form).getAll("delivery")).toEqual(
            mode === "disabled" && active ? [] : ["express"]
          )
        })
        expect(onValueChange).not.toHaveBeenCalled()
      }
    }
  )
})

describe("RadioCard caller styling boundary", () => {
  it("merges caller layout utilities on the rendered member without leaking them to siblings", async () => {
    const { canvas } = await mount(
      <RadioCard
        aria-label="Delivery method"
        className="caller-root w-auto flex-row"
        defaultValue="standard"
      >
        <RadioCard.Item className="caller-item rounded-none" value="standard">
          <RadioCard.ItemHiddenInput />
          <RadioCard.ItemControl className="caller-control flex-col p-0">
            <RadioCard.ItemContent className="caller-content flex-row">
              <RadioCard.ItemText className="caller-title">
                Standard delivery
              </RadioCard.ItemText>
              <RadioCard.ItemDescription className="caller-description">
                Arrives in 3–5 business days.
              </RadioCard.ItemDescription>
            </RadioCard.ItemContent>
            <RadioCard.ItemIndicator className="caller-mark size-0" />
          </RadioCard.ItemControl>
          <RadioCard.ItemAddon className="caller-price">
            Free
          </RadioCard.ItemAddon>
        </RadioCard.Item>
      </RadioCard>
    )
    const root = required(canvas.querySelector('[role="radiogroup"]'))
    expect(root.classList.contains("w-auto")).toBe(true)
    expect(root.classList.contains("w-full")).toBe(false)
    expect(root.classList.contains("flex-row")).toBe(true)
    expect(root.classList.contains("flex-col")).toBe(false)
    const control = required(canvas.querySelector('[data-part="item-control"]'))
    expect(control.classList.contains("p-0")).toBe(true)
    expect(control.classList.contains("p-radio-card-item-control-md")).toBe(
      false
    )
    expect(control.classList.contains("flex-col")).toBe(true)
    expect(control.classList.contains("flex-row")).toBe(false)
    const content = required(canvas.querySelector(".caller-content"))
    expect(content.classList.contains("flex-row")).toBe(true)
    expect(content.classList.contains("flex-col")).toBe(false)
    const item = required(canvas.querySelector('[data-part="item"]'))
    expect(item.classList.contains("rounded-none")).toBe(true)
    expect(item.classList.contains("rounded-radio-card-item")).toBe(false)
    for (const [marker, selector] of [
      ["caller-root", '[role="radiogroup"]'],
      ["caller-item", '[data-part="item"]'],
      ["caller-control", '[data-part="item-control"]'],
      ["caller-title", '[data-part="item-text"]'],
      ["caller-description", '[data-part="item-description"]'],
      ["caller-price", '[data-part="item-addon"]'],
    ] as const) {
      expect(canvas.querySelectorAll(`.${marker}`)).toHaveLength(1)
      expect(canvas.querySelector(`.${marker}`)).toBe(
        canvas.querySelector(selector)
      )
    }
    const indicator = required(
      canvas.querySelector('[data-part="item-indicator"]')
    )
    const mark = required(canvas.querySelector(".caller-mark"))
    expect(indicator.contains(mark)).toBe(true)
    expect(indicator.classList.contains("caller-mark")).toBe(false)
    expect(mark.classList.contains("size-0")).toBe(true)
    expect(mark.classList.contains("size-radio-card-indicator-mark-md")).toBe(
      false
    )
    expect(
      required(canvas.querySelector<HTMLInputElement>('input[type="radio"]'))
        .checked
    ).toBe(true)
  })

  it.each(variants)(
    "preserves caller title, description and price styles through %s selection updates",
    async (variant) => {
      const titleRef = vi.fn()
      const descriptionRef = vi.fn()
      const priceRef = vi.fn()
      const view = (value: string | null) => (
        <RadioCard aria-label="Delivery method" value={value} variant={variant}>
          <RadioCard.Item value="standard">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemText
                className="caller-title"
                ref={titleRef}
                style={{ color: "rgb(21, 37, 53)" }}
              >
                Standard delivery
              </RadioCard.ItemText>
              <RadioCard.ItemDescription
                className="caller-description"
                ref={descriptionRef}
                style={{ color: "rgb(65, 81, 97)" }}
              >
                Arrives in 3–5 business days.
              </RadioCard.ItemDescription>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
            <RadioCard.ItemAddon
              className="caller-price"
              ref={priceRef}
              style={{ color: "rgb(109, 125, 141)" }}
            >
              Free
            </RadioCard.ItemAddon>
          </RadioCard.Item>
        </RadioCard>
      )
      const { canvas, render } = await mount(view(null))
      for (const value of ["standard", null]) {
        await render(view(value))
        await vi.waitFor(() => {
          const selected = value === "standard"
          expect(
            required(
              canvas.querySelector<HTMLInputElement>('input[type="radio"]')
            ).checked
          ).toBe(selected)
          for (const [part, marker, color, ref] of [
            ["item-text", "caller-title", "rgb(21, 37, 53)", titleRef],
            [
              "item-description",
              "caller-description",
              "rgb(65, 81, 97)",
              descriptionRef,
            ],
            ["item-addon", "caller-price", "rgb(109, 125, 141)", priceRef],
          ] as const) {
            const member = required(
              canvas.querySelector<HTMLElement>(`[data-part="${part}"]`)
            )
            expect(member.classList.contains(marker)).toBe(true)
            expect(member.style.color).toBe(color)
            expect(member.getAttribute("data-state")).toBe(
              selected ? "checked" : "unchecked"
            )
            expect(ref).toHaveBeenCalledWith(member)
          }
        })
      }
    }
  )
})
