// @vitest-environment happy-dom
import {
  act,
  type ComponentProps,
  createElement as h,
  type MouseEvent,
  useState,
} from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Checkbox } from "../src/atoms/checkbox"
import { FormCheckbox } from "../src/molecules/form-checkbox"
import { Switch } from "../src/molecules/switch"

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

function input(): HTMLInputElement {
  const found = container.querySelector<HTMLInputElement>(
    'input[type="checkbox"]'
  )
  if (!found) {
    throw new Error("checkbox input not found")
  }
  return found
}

/** A bare synthetic click. Callers assert in the same tick, before any
 * microtask or timer runs, because that is when a test or script reads it. */
function click(target: HTMLElement = input()) {
  act(() => {
    target.click()
  })
}

/** Let deferred machine work run, to prove nothing toggles a second time. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

type Toggle = typeof FormCheckbox | typeof Switch
type ToggleProps = ComponentProps<typeof FormCheckbox> &
  ComponentProps<typeof Switch>

const toggles: [string, Toggle][] = [
  ["FormCheckbox", FormCheckbox],
  ["Switch", Switch],
]

function toggle(component: Toggle, props: ToggleProps = {}) {
  return h(component as typeof Switch, props, "Accept")
}

describe.each(toggles)("%s programmatic click", (_name, component) => {
  it("toggles an uncontrolled input in the same tick, exactly once", async () => {
    const onCheckedChange = vi.fn()
    render(toggle(component, { onCheckedChange }))

    click()
    expect(input().checked).toBe(true)
    expect(input().getAttribute("aria-checked")).toBe("true")
    expect(onCheckedChange.mock.calls).toEqual([[true]])
    await settle()
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)

    click()
    expect(input().checked).toBe(false)
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]])
    await settle()
    expect(input().checked).toBe(false)
    expect(onCheckedChange).toHaveBeenCalledTimes(2)
  })

  it("toggles a controlled input in the same tick, exactly once", async () => {
    const onCheckedChange = vi.fn()
    function Controlled() {
      const [checked, setChecked] = useState(false)
      return toggle(component, {
        checked,
        onCheckedChange: (next: boolean) => {
          onCheckedChange(next)
          setChecked(next)
        },
      })
    }
    render(h(Controlled))

    click()
    expect(input().checked).toBe(true)
    expect(onCheckedChange.mock.calls).toEqual([[true]])
    await settle()
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)

    click()
    expect(input().checked).toBe(false)
    expect(onCheckedChange.mock.calls).toEqual([[true], [false]])
  })

  it("submits the clicked value when the form is read in the same tick", () => {
    render(
      h("form", null, toggle(component, { name: "consent", required: true }))
    )
    const form = container.querySelector("form")
    if (!form) {
      throw new Error("form not found")
    }

    expect(new FormData(form).get("consent")).toBeNull()
    click()
    expect(new FormData(form).get("consent")).toBe("on")
    click()
    expect(new FormData(form).get("consent")).toBeNull()
  })

  it("restores the native input when a controlled parent rejects the change", async () => {
    const onCheckedChange = vi.fn()
    render(toggle(component, { checked: false, onCheckedChange }))

    click()
    expect(input().checked).toBe(false)
    expect(onCheckedChange.mock.calls).toEqual([[true]])
    await settle()
    expect(input().checked).toBe(false)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
  })

  it("proposes once when a controlled parent accepts later", async () => {
    const onCheckedChange = vi.fn()
    function Deferred() {
      const [checked, setChecked] = useState(false)
      return toggle(component, {
        checked,
        onCheckedChange: (next: boolean) => {
          onCheckedChange(next)
          setTimeout(() => setChecked(next), 0)
        },
      })
    }
    render(h(Deferred))

    click()
    expect(input().checked).toBe(false)
    expect(onCheckedChange.mock.calls).toEqual([[true]])
    await settle()
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
  })

  it("toggles exactly once when the label is clicked", async () => {
    const onCheckedChange = vi.fn()
    render(toggle(component, { onCheckedChange }))
    const label = container.querySelector<HTMLElement>('[data-part="label"]')
    if (!label) {
      throw new Error("label not found")
    }

    click(label)
    expect(input().checked).toBe(true)
    expect(onCheckedChange.mock.calls).toEqual([[true]])
    await settle()
    expect(input().checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
  })

  it("leaves Space to the single native activation click", async () => {
    const onCheckedChange = vi.fn()
    render(toggle(component, { onCheckedChange }))
    const key = { key: " ", code: "Space", bubbles: true, cancelable: true }

    // The key events themselves must not toggle: the browser follows keyup
    // with one activation click, and that click is the only toggle.
    act(() => {
      input().dispatchEvent(new KeyboardEvent("keydown", key))
      input().dispatchEvent(new KeyboardEvent("keyup", key))
    })
    await settle()
    expect(input().checked).toBe(false)
    expect(onCheckedChange).not.toHaveBeenCalled()

    click()
    expect(input().checked).toBe(true)
    await settle()
    expect(onCheckedChange.mock.calls).toEqual([[true]])
  })

  it("ignores the click when read-only or cancelled by the consumer", async () => {
    const onCheckedChange = vi.fn()
    render(toggle(component, { onCheckedChange, readOnly: true }))
    click()
    expect(input().checked).toBe(false)
    act(() => root?.unmount())

    render(
      toggle(component, {
        onCheckedChange,
        inputProps: {
          onClick: (event: MouseEvent<HTMLInputElement>) =>
            event.preventDefault(),
        },
      })
    )
    click()
    expect(input().checked).toBe(false)
    await settle()
    expect(input().checked).toBe(false)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})

describe("Checkbox atom programmatic click", () => {
  it("fires onChange exactly once in the same tick when uncontrolled", async () => {
    const onChange = vi.fn()
    render(h(Checkbox, { onChange }))

    click()
    expect(input().checked).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    await settle()
    expect(input().checked).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
