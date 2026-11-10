// @vitest-environment happy-dom
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"
import { Combobox } from "../src/molecules/combobox"

const items = [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
]

let mounted: { root: Root; container: HTMLElement } | null = null

async function mount(element: ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(() => {
    root.render(element)
  })
  mounted = { root, container }
  return container
}

afterEach(async () => {
  if (mounted) {
    const { root, container } = mounted
    await act(() => {
      root.unmount()
    })
    container.remove()
    mounted = null
  }
  for (const node of document.querySelectorAll("[data-live-announcer]")) {
    node.remove()
  }
})

describe("Combobox openOnClick", () => {
  it("opens the listbox when the input is clicked", async () => {
    const container = await mount(
      <Combobox items={items} label="Fruit" openOnClick />
    )
    const input = container.querySelector("input")
    if (!input) {
      throw new Error("Combobox input not rendered")
    }
    expect(input.getAttribute("aria-expanded")).toBe("false")
    await act(() => {
      input.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(input.getAttribute("aria-expanded")).toBe("true")
  })

  it("keeps the listbox closed on input click by default", async () => {
    const container = await mount(<Combobox items={items} label="Fruit" />)
    const input = container.querySelector("input")
    if (!input) {
      throw new Error("Combobox input not rendered")
    }
    await act(() => {
      input.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(input.getAttribute("aria-expanded")).toBe("false")
  })
})

describe("Combobox translations", () => {
  it("forwards trigger and clear button names to the zag machine", async () => {
    const container = await mount(
      <Combobox
        items={items}
        label="Fruit"
        translations={{
          triggerLabel: "Open fruit list",
          clearTriggerLabel: "Erase fruit",
        }}
        value={["alpha"]}
      />
    )
    expect(
      container.querySelector('button[aria-label="Open fruit list"]')
    ).not.toBeNull()
    expect(
      container.querySelector('button[aria-label="Erase fruit"]')
    ).not.toBeNull()
    expect(
      container.querySelector('button[aria-label="Toggle suggestions"]')
    ).toBeNull()
    expect(
      container.querySelector('button[aria-label="Clear value"]')
    ).toBeNull()
  })

  it("keeps zag's default names when translations are omitted", async () => {
    const container = await mount(
      <Combobox items={items} label="Fruit" value={["alpha"]} />
    )
    expect(
      container.querySelector('button[aria-label="Toggle suggestions"]')
    ).not.toBeNull()
    expect(
      container.querySelector('button[aria-label="Clear value"]')
    ).not.toBeNull()
  })
})
