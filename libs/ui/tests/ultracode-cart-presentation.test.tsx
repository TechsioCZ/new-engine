// @vitest-environment happy-dom
import { act, type ReactElement } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import meta, {
  CartAndRecap,
  MultipleItems,
  Playground,
} from "../stories/templates/cart-presentation.stories"

type Fixture = { render?: unknown; args?: unknown }

function storyElement(story: Fixture, readOnly = false) {
  if (story.render) {
    const render = story.render as () => ReactElement
    return render()
  }
  const Component = meta.component
  if (!Component) {
    throw new Error("Missing CartPresentation component")
  }
  return <Component readOnly={readOnly} />
}

function decorate(element: ReactElement) {
  const decorators = meta.decorators
  const decorator = Array.isArray(decorators) ? decorators[0] : decorators
  if (!decorator) {
    throw new Error("Missing CartPresentation gutter decorator")
  }
  return decorator(() => element, {} as never)
}

function canvas(story: Fixture, readOnly = false) {
  const element = document.createElement("div")
  element.innerHTML = renderToStaticMarkup(
    decorate(storyElement(story, readOnly))
  )
  return element
}

function query<T extends Element = HTMLElement>(
  parent: ParentNode,
  selector: string
) {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Missing cart element: ${selector}`)
  }
  return element
}

function button(parent: ParentNode, label: string) {
  const element = [...parent.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label
  )
  if (!element) {
    throw new Error(`Missing cart action: ${label}`)
  }
  return element
}

describe("CartPresentation local composition", () => {
  it.each<[string, Fixture, boolean]>([
    ["Playground", Playground, false],
    ["Read-only Playground", Playground, true],
    ["CartAndRecap", CartAndRecap, false],
    ["MultipleItems", MultipleItems, false],
  ])("keeps %s inside the captured gutter", (_, story, readOnly) => {
    const element = canvas(story, readOnly)
    const inset = query(element, ":scope > div")
    expect(meta.parameters?.layout).toBe("fullscreen")
    for (const name of ["w-full", "min-w-0", "p-200"]) {
      expect(inset.classList.contains(name)).toBe(true)
    }
    // Body padding is outside a #storybook-root screenshot. The item, totals
    // and every focusable action must instead share the local inset.
    for (const child of element.querySelectorAll(
      '[data-scope="line-item"], [data-scope="totals-summary"], button'
    )) {
      expect(inset.contains(child)).toBe(true)
    }
    expect(inset.querySelector(".overflow-hidden")).toBeNull()
  })

  it("aligns actions in a stable first-control-line frame without centering against feedback", () => {
    const element = canvas(Playground)
    const controls = query(element, '[data-part="controls"]')
    expect(controls.classList.contains("items-baseline")).toBe(false)
    expect(controls.classList.contains("items-start")).toBe(true)
    expect(controls.classList.contains("items-center")).toBe(false)
    const actions = query(controls, '[data-part="actions"]')
    expect(actions.classList.contains("items-center")).toBe(true)
    expect(actions.classList.contains("min-h-(--height-form-control-sm)")).toBe(
      true
    )
    const quantity = query(controls, '[data-part="quantity"]')
    expect(
      quantity.classList.contains("max-w-cart-presentation-quantity!")
    ).toBe(true)
    const input = query<HTMLInputElement>(quantity, 'input[role="spinbutton"]')
    expect(input.id).toBeTruthy()
    const label = [...quantity.querySelectorAll("label")].find(
      (candidate) => candidate.htmlFor === input.id
    )
    expect(label?.textContent).toBe("Množství: Montážní sada M8")
    expect(input.value).toBe("2")
    expect(
      query(controls, '[data-part="remove"]').getAttribute("aria-label")
    ).toBe("Odebrat: Montážní sada M8")
  })

  it("retains cart/recap prices, shipping labels and definition-list semantics", () => {
    const element = canvas(CartAndRecap)
    const summaries = element.querySelectorAll('[data-scope="totals-summary"]')
    expect(summaries).toHaveLength(2)
    const cart = summaries[0]
    const recap = summaries[1]
    expect(cart?.textContent).toContain("Zvolte dopravu")
    expect(cart?.textContent).toContain("Mezisoučet včetně DPH")
    expect(recap?.textContent).toContain("Celkem včetně DPH")
    expect(recap?.textContent).toContain("89 Kč")
    expect(recap?.textContent).toContain("Doručení na adresu, platba kartou.")
    expect(recap?.querySelector("button")).toBeNull()
    expect(element.querySelectorAll("dl")).toHaveLength(2)
    expect(element.querySelectorAll("dt")).toHaveLength(6)
    expect(element.querySelectorAll("dd")).toHaveLength(6)
    expect(element.textContent).toContain("100 ks · pozink · kód MS-008")
    expect(element.textContent).toContain("2 balení")
  })

  it("keeps multi-item Undo subordinate while retaining focus on the surviving item", async () => {
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () => root.render(decorate(storyElement(MultipleItems))))
      await act(async () =>
        query<HTMLButtonElement>(host, '[data-part="remove"]').click()
      )
      const restore = button(host, "Vrátit poslední odebraný produkt")
      expect(restore.classList.contains("bg-button-bg-outlined")).toBe(true)
      expect(restore.classList.contains("bg-button-bg-secondary-base")).toBe(
        false
      )
      expect(restore.classList.contains("self-start")).toBe(true)
      expect(restore.classList.contains("max-w-full")).toBe(true)
      expect(document.activeElement?.getAttribute("aria-label")).toBe(
        "Odebrat: Podložky M8"
      )
      await act(async () => restore.click())
      expect(document.activeElement?.getAttribute("aria-label")).toBe(
        "Odebrat: Montážní sada M8"
      )
      expect(host.querySelectorAll('[data-scope="line-item"]')).toHaveLength(2)
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })

  it("preserves review, edit and remove/restore focus behavior in RTL", async () => {
    const host = document.createElement("div")
    host.dir = "rtl"
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () => root.render(decorate(storyElement(Playground))))
      const inset = query(host, ":scope > div")
      await act(async () => button(host, "Pokračovat k objednávce").click())
      expect(host.querySelector('input[role="spinbutton"]')).toBeNull()
      expect(host.querySelector('[data-part="remove"]')).toBeNull()
      expect(host.textContent).toContain("Celkem včetně DPH")
      expect(host.textContent).toContain("587")
      const edit = button(host, "Upravit košík")
      expect(edit.classList.contains("bg-button-bg-outlined")).toBe(true)
      expect(edit.classList.contains("bg-button-bg-secondary-base")).toBe(false)
      await act(async () => edit.click())
      expect(query<HTMLInputElement>(host, "input").value).toBe("2")
      await act(async () =>
        query<HTMLButtonElement>(host, '[data-part="remove"]').click()
      )
      const restore = button(host, "Vrátit produkt do košíku")
      expect(host.querySelector('[role="status"]')?.textContent).toBe(
        "Košík je prázdný."
      )
      expect(inset.contains(restore)).toBe(true)
      expect(document.activeElement).toBe(restore)
      expect(restore.classList.contains("bg-button-bg-outlined")).toBe(true)
      expect(restore.classList.contains("bg-button-bg-secondary-base")).toBe(
        false
      )
      expect(restore.classList.contains("self-start")).toBe(true)
      expect(restore.classList.contains("max-w-full")).toBe(true)
      await act(async () => restore.click())
      const input = query<HTMLInputElement>(host, "input")
      expect(document.activeElement).toBe(input)
      expect(input.value).toBe("2")
      expect(host.textContent).toContain("498")
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
})
