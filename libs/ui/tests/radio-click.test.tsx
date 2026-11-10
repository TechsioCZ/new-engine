// @vitest-environment happy-dom
import { act, createElement as h, type MouseEvent, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RadioCard } from "../src/molecules/radio-card"
import { RadioGroup } from "../src/molecules/radio-group"

let container: HTMLDivElement
let root: Root | undefined

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  container = document.createElement("div")
  document.body.append(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  container.remove()
  vi.unstubAllGlobals()
})

function render(element: ReturnType<typeof h>) {
  root = createRoot(container)
  act(() => root?.render(element))
}

function radio(value: string): HTMLInputElement {
  const found = container.querySelector<HTMLInputElement>(
    `input[type="radio"][value="${value}"]`
  )
  if (!found) {
    throw new Error(`radio "${value}" not found`)
  }
  return found
}

/** The values of the radios that are natively checked right now. */
function selected(): string[] {
  return Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  )
    .filter((node) => node.checked)
    .map((node) => node.value)
}

function form(): HTMLFormElement {
  const found = container.querySelector("form")
  if (!found) {
    throw new Error("form not found")
  }
  return found
}

/** A bare synthetic click. Callers assert in the same tick, before any
 * microtask or timer runs, because that is when a test or script reads it. */
function click(target: HTMLElement) {
  act(() => {
    target.click()
  })
}

/** Let deferred machine work run, to prove nothing selects a second time. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

type Radio = typeof RadioGroup | typeof RadioCard
type RadioProps = {
  defaultValue?: string
  value?: string | null
  name?: string
  readOnly?: boolean
  disabled?: boolean
  onValueChange?: (value: string | null) => void
  onInputClick?: (event: MouseEvent<HTMLInputElement>) => void
}

const radios: [string, Radio][] = [
  ["RadioGroup", RadioGroup],
  ["RadioCard", RadioCard],
]

function group(component: Radio, props: RadioProps = {}) {
  const { onInputClick, ...rootProps } = props
  const Parts = component as typeof RadioGroup
  return (
    <Parts aria-label="Plan" name="plan" {...rootProps}>
      {["a", "b", "c"].map((value) => (
        <Parts.Item key={value} value={value}>
          <Parts.ItemHiddenInput onClick={onInputClick} />
          <Parts.ItemControl />
          <Parts.ItemText>{value}</Parts.ItemText>
        </Parts.Item>
      ))}
    </Parts>
  )
}

describe.each(radios)("%s programmatic click", (_name, component) => {
  it("selects an uncontrolled radio in the same tick, exactly once", async () => {
    const onValueChange = vi.fn()
    render(h("form", null, group(component, { onValueChange })))

    expect(new FormData(form()).get("plan")).toBeNull()
    click(radio("b"))
    expect(radio("b").checked).toBe(true)
    expect(selected()).toEqual(["b"])
    expect(new FormData(form()).get("plan")).toBe("b")
    expect(onValueChange.mock.calls).toEqual([["b"]])
    await settle()
    expect(selected()).toEqual(["b"])
    expect(new FormData(form()).get("plan")).toBe("b")
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it("moves the selection to another option exactly once", async () => {
    const onValueChange = vi.fn()
    render(
      h("form", null, group(component, { defaultValue: "a", onValueChange }))
    )

    expect(selected()).toEqual(["a"])
    click(radio("b"))
    expect(selected()).toEqual(["b"])
    expect(new FormData(form()).getAll("plan")).toEqual(["b"])
    expect(onValueChange.mock.calls).toEqual([["b"]])

    click(radio("c"))
    expect(selected()).toEqual(["c"])
    expect(new FormData(form()).getAll("plan")).toEqual(["c"])
    expect(onValueChange.mock.calls).toEqual([["b"], ["c"]])
    await settle()
    expect(selected()).toEqual(["c"])
    expect(onValueChange).toHaveBeenCalledTimes(2)

    // Clicking the selected option again proposes nothing.
    click(radio("c"))
    await settle()
    expect(selected()).toEqual(["c"])
    expect(onValueChange).toHaveBeenCalledTimes(2)
  })

  it("selects a controlled radio in the same tick, exactly once", async () => {
    const onValueChange = vi.fn()
    function Controlled() {
      const [value, setValue] = useState<string | null>("a")
      return group(component, {
        value,
        onValueChange: (next) => {
          onValueChange(next)
          setValue(next)
        },
      })
    }
    render(h("form", null, h(Controlled)))

    click(radio("b"))
    expect(selected()).toEqual(["b"])
    expect(new FormData(form()).get("plan")).toBe("b")
    expect(onValueChange.mock.calls).toEqual([["b"]])
    await settle()
    expect(selected()).toEqual(["b"])
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it("restores the native state when a controlled parent rejects the change", async () => {
    const onValueChange = vi.fn()
    render(h("form", null, group(component, { value: "a", onValueChange })))

    click(radio("b"))
    expect(selected()).toEqual(["a"])
    expect(new FormData(form()).get("plan")).toBe("a")
    expect(onValueChange.mock.calls).toEqual([["b"]])
    await settle()
    expect(selected()).toEqual(["a"])
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it("proposes once when a controlled parent accepts later", async () => {
    const onValueChange = vi.fn()
    function Deferred() {
      const [value, setValue] = useState<string | null>("a")
      return group(component, {
        value,
        onValueChange: (next) => {
          onValueChange(next)
          setTimeout(() => setValue(next), 0)
        },
      })
    }
    render(h(Deferred))

    click(radio("b"))
    expect(selected()).toEqual(["a"])
    expect(onValueChange.mock.calls).toEqual([["b"]])
    await settle()
    expect(selected()).toEqual(["b"])
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it("selects exactly once when the item label is clicked", async () => {
    const onValueChange = vi.fn()
    render(group(component, { onValueChange }))
    const label = radio("b").closest("label")
    if (!label) {
      throw new Error("item label not found")
    }

    click(label)
    expect(selected()).toEqual(["b"])
    expect(onValueChange.mock.calls).toEqual([["b"]])
    await settle()
    expect(selected()).toEqual(["b"])
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it("does not change when read-only or disabled", async () => {
    const onValueChange = vi.fn()
    render(
      group(component, { defaultValue: "a", onValueChange, readOnly: true })
    )
    click(radio("b"))
    expect(selected()).toEqual(["a"])
    await settle()
    expect(selected()).toEqual(["a"])
    act(() => root?.unmount())

    render(
      group(component, { defaultValue: "a", onValueChange, disabled: true })
    )
    click(radio("b"))
    expect(selected()).toEqual(["a"])
    await settle()
    expect(selected()).toEqual(["a"])
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("does not change when the consumer cancels the click", async () => {
    const onValueChange = vi.fn()
    render(
      group(component, {
        defaultValue: "a",
        onValueChange,
        onInputClick: (event) => event.preventDefault(),
      })
    )

    click(radio("b"))
    expect(selected()).toEqual(["a"])
    await settle()
    expect(selected()).toEqual(["a"])
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("selects once per arrow key, in the same tick", async () => {
    const onValueChange = vi.fn()
    render(group(component, { defaultValue: "a", onValueChange }))
    const press = (from: string, key: string) =>
      act(() => {
        radio(from).focus()
        radio(from).dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
        )
      })

    press("a", "ArrowDown")
    expect(selected()).toEqual(["b"])
    expect(document.activeElement).toBe(radio("b"))
    expect(onValueChange.mock.calls).toEqual([["b"]])
    await settle()
    expect(selected()).toEqual(["b"])
    expect(onValueChange).toHaveBeenCalledTimes(1)

    press("b", "ArrowUp")
    expect(selected()).toEqual(["a"])
    expect(onValueChange.mock.calls).toEqual([["b"], ["a"]])
    await settle()
    expect(selected()).toEqual(["a"])
    expect(onValueChange).toHaveBeenCalledTimes(2)
  })
})
