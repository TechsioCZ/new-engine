// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss from "postcss"
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import meta, {
  LongContent,
  Pending,
  Playground,
  ReadOnly,
  Unavailable,
} from "../stories/organisms/line-item.stories"

type Fixture = { render?: unknown; args?: unknown }

function canvas(story: Fixture) {
  const render = story.render as (args: unknown) => ReactElement
  const element = document.createElement("div")
  element.innerHTML = renderToStaticMarkup(
    render({ ...meta.args, ...(story.args ?? {}) })
  )
  return element
}

function part<T extends HTMLElement = HTMLElement>(
  element: ParentNode,
  name: string
) {
  const match = element.querySelector<T>(`[data-part="${name}"]`)
  if (!match) {
    throw new Error(`Missing LineItem part: ${name}`)
  }
  return match
}

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
const css = postcss.parse(
  read("../src/tokens/components/organisms/_line-item.css")
)

describe("LineItem pending presentation", () => {
  it("uses readable item tokens instead of small neutral helper text", () => {
    const message = part(canvas(Pending), "pending")
    expect(message.classList.contains("text-line-item-content-fg")).toBe(true)
    expect(message.classList.contains("text-line-item-detail-size")).toBe(true)
    expect(message.classList.contains("text-status-text-fg")).toBe(false)
    expect(message.classList.contains("text-status-text-sm")).toBe(false)
  })

  it("matches only the composed quantity pending message, not errors or controls", () => {
    const element = canvas(Pending)
    const quantity = part(element, "quantity")
    expect(quantity.classList.contains("line-item-quantity")).toBe(true)
    expect(
      quantity.querySelector(' [data-pending] > [role="status"]')?.textContent
    ).toBe("Ukládáme množství")
    const declarations = new Map<string, string>()
    css.walkAtRules("utility", (utility) => {
      if (utility.params !== "line-item-quantity") {
        return
      }
      utility.walkRules((rule) => {
        expect(rule.selector).toBe('& > [data-pending] > [role="status"]')
        rule.walkDecls((decl) => {
          declarations.set(decl.prop, decl.value)
        })
      })
    })
    expect(Object.fromEntries(declarations)).toEqual({
      color: "var(--color-line-item-content-fg)",
      "font-size": "var(--text-line-item-detail-size)",
    })
  })

  it("keeps item feedback outside inert actions with its description intact", () => {
    const element = canvas(Pending)
    const message = part(element, "pending")
    const item = message.parentElement
    if (!item) {
      throw new Error("Missing LineItem root")
    }
    expect(item.getAttribute("aria-busy")).toBe("true")
    expect(item.getAttribute("aria-describedby")?.split(" ")).toContain(
      message.id
    )
    expect(message.closest("[inert]")).toBeNull()
    expect(message.textContent).toBe("Ukládáme položku")
    expect(
      item.querySelector('[data-part="quantity"]')?.hasAttribute("inert")
    ).toBe(true)
    expect(
      item.querySelector('[data-part="actions"]')?.hasAttribute("inert")
    ).toBe(true)
    expect(item.querySelector("input")?.disabled).toBe(true)
    expect(
      item.querySelector("button[data-part=remove]")?.hasAttribute("disabled")
    ).toBe(true)
  })

  it.each([Playground, Unavailable, LongContent])(
    "preserves removal padding, focus treatment and the product-specific name",
    (story) => {
      const element = canvas(story)
      const button = part<HTMLButtonElement>(element, "remove")
      const title = part(element, "title").textContent
      expect(button.getAttribute("aria-label")).toBe(`Odebrat: ${title}`)
      expect(button.disabled).toBe(false)
      expect(button.classList.contains("p-button-sm")).toBe(true)
      expect(button.classList.contains("button-size-sm")).toBe(true)
      expect(
        button.classList.contains("focus-visible:outline-button-ring")
      ).toBe(true)
      expect(button.closest("[inert]")).toBeNull()
    }
  )

  it("retains long content and read-only composition", () => {
    const long = canvas(LongContent)
    expect(long.querySelector('[data-part="title"]')?.textContent).toBe(
      "Montážní sada pro připevnění těžkých polic a regálů v dílně"
    )
    expect(long.textContent).toContain("100 ks · pozink · kód MS-008")
    expect(long.textContent).toContain("498 Kč")
    const readOnly = canvas(ReadOnly)
    expect(readOnly.querySelector('[data-part="quantity"]')?.textContent).toBe(
      "2 balení"
    )
    expect(readOnly.querySelector("input, button")).toBeNull()
  })
})
