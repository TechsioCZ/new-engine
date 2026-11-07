// @vitest-environment happy-dom
import { act, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CascadeSelect } from "../src/molecules/cascade-select"

const items = [
  { label: "Weather-resistant dining sets", value: "dining" },
  { label: "Outdoor furniture and accessories", value: "outdoor" },
]
const roots: Root[] = []

function field(props: Partial<ComponentProps<typeof CascadeSelect>> = {}) {
  return (
    <CascadeSelect
      defaultValue={[["dining"]]}
      items={items}
      name="category"
      required
      validateStatus="error"
      {...props}
    >
      <CascadeSelect.Label>Product category</CascadeSelect.Label>
      <CascadeSelect.Control>
        <CascadeSelect.Trigger>
          <CascadeSelect.ValueText />
          <CascadeSelect.Indicator />
        </CascadeSelect.Trigger>
        <CascadeSelect.ClearTrigger />
      </CascadeSelect.Control>
      <CascadeSelect.Content
        aria-describedby="category-help"
        aria-invalid="true"
      >
        <CascadeSelect.Node />
      </CascadeSelect.Content>
      <p id="category-help">Choose the most specific category.</p>
    </CascadeSelect>
  )
}

function part<T extends HTMLElement = HTMLElement>(
  canvas: HTMLElement,
  name: string
): T {
  const node = canvas.querySelector<T>(`[data-part="${name}"]`)
  if (!node) {
    throw new Error(`Missing CascadeSelect part: ${name}`)
  }
  return node
}

async function mount(props: Partial<ComponentProps<typeof CascadeSelect>>) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(field(props)))
  return canvas
}

async function press(target: HTMLElement, key: string) {
  await act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }))
  })
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

describe("CascadeSelect tree ARIA projection", () => {
  it.each([
    { readOnly: false, multiple: false },
    { readOnly: false, multiple: true },
    { readOnly: true, multiple: false },
    { readOnly: true, multiple: true },
  ])(
    "omits listbox-only readonly while preserving tree and combobox semantics (%j)",
    ({ readOnly, multiple }) => {
      const canvas = document.createElement("div")
      canvas.innerHTML = renderToStaticMarkup(
        field({
          defaultHighlightedValue: ["outdoor"],
          defaultOpen: true,
          multiple,
          readOnly,
        })
      )
      const content = part(canvas, "content")
      const trigger = part<HTMLButtonElement>(canvas, "trigger")
      expect(content.getAttribute("role")).toBe("tree")
      expect(content.hasAttribute("aria-readonly")).toBe(false)
      expect(content.getAttribute("aria-required")).toBe("true")
      expect(content.getAttribute("aria-invalid")).toBe("true")
      expect(content.getAttribute("aria-multiselectable")).toBe(
        String(multiple)
      )
      expect(content.getAttribute("aria-describedby")).toBe("category-help")
      expect(content.getAttribute("tabindex")).toBe("0")
      expect(content.hidden).toBe(readOnly)
      const activeId = content.getAttribute("aria-activedescendant")
      expect(activeId).toBeTruthy()
      expect(
        canvas.querySelector(`[id="${activeId}"]`)?.getAttribute("role")
      ).toBe("treeitem")
      const label = part(canvas, "label")
      expect(label.textContent).toBe("Product category* (required)")
      expect(content.getAttribute("aria-labelledby")).toBe(label.id)
      expect(trigger.getAttribute("aria-labelledby")).toBe(label.id)
      expect(trigger.getAttribute("role")).toBe("combobox")
      expect(trigger.getAttribute("aria-haspopup")).toBe("tree")
      expect(trigger.getAttribute("aria-controls")).toBe(content.id)
      expect(trigger.getAttribute("aria-expanded")).toBe(String(!readOnly))
      expect(trigger.getAttribute("aria-readonly")).toBe(
        readOnly ? "true" : null
      )
      expect(trigger.getAttribute("aria-required")).toBe("true")
      expect(trigger.getAttribute("aria-invalid")).toBe("true")
      expect(trigger.disabled).toBe(false)
    }
  )

  it.each(["click", "keyboard"] as const)(
    "keeps editable %s opening and selection working",
    async (interaction) => {
      const onValueChange = vi.fn()
      const canvas = await mount({ onValueChange, readOnly: false })
      const trigger = part<HTMLButtonElement>(canvas, "trigger")
      await act(() => trigger.focus())
      if (interaction === "click") {
        await act(() => trigger.click())
      } else {
        await press(trigger, "ArrowDown")
      }
      const content = part(canvas, "content")
      expect(content.hidden).toBe(false)
      expect(content.hasAttribute("aria-readonly")).toBe(false)
      if (interaction === "click") {
        const outdoor = canvas.querySelector<HTMLElement>(
          '[role="treeitem"][data-value="outdoor"]'
        )
        expect(outdoor).not.toBeNull()
        await act(() => outdoor?.click())
      } else {
        await press(content, "End")
        await press(content, "Enter")
      }
      expect(onValueChange).toHaveBeenCalledTimes(1)
      expect(onValueChange).toHaveBeenCalledWith(
        expect.objectContaining({ value: [["outdoor"]] })
      )
      expect(
        canvas.querySelector<HTMLInputElement>('input[name="category"]')?.value
      ).toBe("outdoor")
      expect(part(canvas, "value-text").textContent).toBe(items[1]?.label)
    }
  )

  it.each(["defaultOpen", "open"] as const)(
    "keeps readonly restrictions even when %s requests an open popup",
    async (openProp) => {
      const onValueChange = vi.fn()
      const canvas = await mount({
        [openProp]: true,
        onValueChange,
        readOnly: true,
      })
      const trigger = part<HTMLButtonElement>(canvas, "trigger")
      const content = part(canvas, "content")
      expect(content.hasAttribute("aria-readonly")).toBe(false)
      expect(trigger.getAttribute("aria-readonly")).toBe("true")
      expect(trigger.disabled).toBe(false)
      await act(() => {
        trigger.focus()
        trigger.click()
      })
      expect(document.activeElement).toBe(trigger)
      for (const key of ["ArrowDown", "Enter", " "]) {
        await press(trigger, key)
      }
      // Even direct dispatch to the closed content must not bypass readonly.
      for (const key of ["End", "Enter", " "]) {
        await press(content, key)
      }
      await act(() => {
        for (const item of canvas.querySelectorAll<HTMLElement>(
          '[role="treeitem"]'
        )) {
          item.click()
        }
      })
      expect(content.hidden).toBe(true)
      expect(trigger.getAttribute("aria-expanded")).toBe("false")
      expect(canvas.querySelector('[data-part="clear-trigger"]')).toBeNull()
      expect(canvas.querySelector('[data-part="indicator"]')).toBeNull()
      expect(onValueChange).not.toHaveBeenCalled()
      expect(
        canvas.querySelector<HTMLInputElement>('input[name="category"]')?.value
      ).toBe("dining")
      expect(part(canvas, "value-text").textContent).toBe(items[0]?.label)
    }
  )
})
