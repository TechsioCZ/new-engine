// @vitest-environment happy-dom
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import meta, {
  CartAndRecap,
  MultipleItems,
} from "../stories/templates/cart-presentation.stories"

function fixture(element: ReactElement) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(element)
  return canvas
}

function playground(readOnly = false) {
  const Component = meta.component
  if (!Component) {
    throw new Error("Missing cart example")
  }
  return <Component readOnly={readOnly} />
}

function comparison() {
  if (!CartAndRecap.render) {
    throw new Error("Missing cart comparison")
  }
  return CartAndRecap.render({} as never, {} as never)
}

function multipleItems() {
  if (!MultipleItems.render) {
    throw new Error("Missing multi-item cart")
  }
  return MultipleItems.render({} as never, {} as never)
}

const compactExamples = [
  ["editable", () => playground()],
  ["read-only", () => playground(true)],
  ["multiple items", multipleItems],
] as const

describe("Cart story layout comparison", () => {
  it.each(compactExamples)(
    "centers the compact %s example",
    (_name, render) => {
      const surface = fixture(render()).firstElementChild
      expect(surface?.classList.contains("mx-auto")).toBe(true)
      expect(
        surface?.classList.contains("max-w-full") ||
          surface?.classList.contains("w-full")
      ).toBe(true)
    }
  )

  it("uses a bounded, top-aligned desktop pair with a single mobile column", () => {
    const surface = fixture(comparison()).firstElementChild
    for (const name of [
      "mx-auto",
      "grid",
      "w-full",
      "max-w-6xl",
      "grid-cols-1",
      "lg:grid-cols-2",
      "items-start",
      "gap-800",
      "space-y-0",
    ]) {
      expect(surface?.classList.contains(name), name).toBe(true)
    }
    expect(surface?.classList.contains("flex")).toBe(false)
    expect(surface?.classList.contains("space-y-800")).toBe(false)
    expect(surface?.children).toHaveLength(2)
    const [cart, recap] = Array.from(surface?.children ?? [])
    expect(cart?.querySelector("h3")?.textContent).toContain("Košík:")
    expect(recap?.querySelector("h3")?.textContent).toContain("Rekapitulace:")
    expect(cart?.querySelector('input[role="spinbutton"]')).not.toBeNull()
    expect(cart?.querySelector('[data-part="remove"]')).not.toBeNull()
    expect(recap?.querySelector("input, button")).toBeNull()
    expect(recap?.textContent).toContain("2 balení")
    expect(recap?.textContent).toContain("Doručení na adresu, platba kartou.")
  })

  it("reserves local inline clearance for the multi-item action's focus paint", () => {
    const surface = fixture(multipleItems()).firstElementChild
    expect(surface?.classList.contains("px-100")).toBe(true)
    expect(surface?.classList.contains("overflow-hidden")).toBe(false)
  })

  it("keeps the same borderless Remove styling and genuine focus outline in both editable fixtures", () => {
    const singleRemove = fixture(playground()).querySelector(
      '[data-part="remove"]'
    )
    const multipleRemoves = fixture(multipleItems()).querySelectorAll(
      '[data-part="remove"]'
    )
    expect(singleRemove).not.toBeNull()
    expect(multipleRemoves).toHaveLength(2)
    for (const remove of [singleRemove, ...multipleRemoves]) {
      expect(remove?.className).toBe(singleRemove?.className)
      expect(remove?.classList.contains("bg-button-bg-borderless-base")).toBe(
        true
      )
      expect(remove?.classList.contains("bg-button-bg-outlined")).toBe(false)
      expect(
        remove?.classList.contains("focus-visible:outline-button-ring")
      ).toBe(true)
    }
  })
})
