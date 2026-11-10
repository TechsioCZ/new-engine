// @vitest-environment happy-dom
import { act, createElement as h, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Checkbox } from "../src/atoms/checkbox"
import { FormCheckbox } from "../src/molecules/form-checkbox"
import { Switch } from "../src/molecules/switch"

let container: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  container = document.createElement("div")
  document.body.append(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  container.remove()
})

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function render(element: ReturnType<typeof h>) {
  root = createRoot(container)
  act(() => root?.render(element))
}

function input(): HTMLInputElement {
  const found = container.querySelector<HTMLInputElement>(
    'input[type="checkbox"]'
  )
  if (!found) {
    throw new Error("checkbox input not found")
  }
  return found
}

async function clickInput() {
  await act(async () => {
    input().click()
    await flush()
  })
}

describe("FormCheckbox programmatic click", () => {
  it("toggles an uncontrolled checkbox exactly once on input.click()", async () => {
    const onCheckedChange = vi.fn()
    render(h(FormCheckbox, { label: "Accept", onCheckedChange }))

    await clickInput()
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)

    await clickInput()
    expect(input().checked).toBe(false)
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
  })

  it("toggles a controlled checkbox exactly once on input.click()", async () => {
    const onCheckedChange = vi.fn()
    function Controlled() {
      const [checked, setChecked] = useState(false)
      return h(FormCheckbox, {
        label: "Accept",
        checked,
        onCheckedChange: (next: boolean) => {
          onCheckedChange(next)
          setChecked(next)
        },
      })
    }
    render(h(Controlled))

    await clickInput()
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)

    await clickInput()
    expect(input().checked).toBe(false)
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
  })

  it("toggles exactly once when the label is clicked", async () => {
    const onCheckedChange = vi.fn()
    render(h(FormCheckbox, { label: "Accept", onCheckedChange }))

    const label = container.querySelector<HTMLElement>('[data-part="label"]')
    if (!label) {
      throw new Error("label not found")
    }
    await act(async () => {
      label.click()
      await flush()
    })
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
  })
})

describe("Checkbox atom programmatic click", () => {
  it("fires onChange exactly once on input.click() when uncontrolled", async () => {
    const onChange = vi.fn()
    render(h(Checkbox, { onChange }))

    await clickInput()
    expect(input().checked).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe("Switch programmatic click", () => {
  it("toggles exactly once on input.click()", async () => {
    const onCheckedChange = vi.fn()
    render(h(Switch, { onCheckedChange }, "Notify"))

    await clickInput()
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
  })
})
