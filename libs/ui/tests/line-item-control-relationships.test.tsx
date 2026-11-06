// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss from "postcss"
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LineItem, type LineItemRemoveProps } from "../src/organisms/line-item"
import meta, {
  ItemError,
  Pending,
} from "../stories/organisms/line-item.stories"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
const css = postcss.parse(
  read("../src/tokens/components/organisms/_line-item.css")
)

function utility(name: string) {
  const declarations: Record<string, string> = {}
  css.walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      rule.walkDecls((declaration) => {
        declarations[declaration.prop] = declaration.value
      })
    }
  })
  return declarations
}

function render(element: ReactElement) {
  const container = document.createElement("div")
  container.innerHTML = renderToStaticMarkup(element)
  return container
}

function fixture(story: { render?: unknown; args?: unknown }) {
  const storyRender = story.render as (args: unknown) => ReactElement
  return render(storyRender({ ...meta.args, ...(story.args ?? {}) }))
}

function query<T extends Element = HTMLElement>(
  parent: ParentNode,
  selector: string
) {
  const element = parent.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Missing fixture element: ${selector}`)
  }
  return element
}

function remove(props: Omit<LineItemRemoveProps, "label"> = {}) {
  return query<HTMLButtonElement>(
    render(
      <LineItem title="Montážní sada M8">
        <LineItem.Actions>
          <LineItem.Remove label="Odebrat" {...props} />
        </LineItem.Actions>
      </LineItem>
    ),
    "button"
  )
}

describe("LineItem control relationships", () => {
  it("uses one local feedback gap for wrapped controls and item feedback", () => {
    const tokens: Record<string, string> = {}
    css.walkAtRules("theme", (theme) => {
      theme.walkDecls((declaration) => {
        tokens[declaration.prop] = declaration.value
      })
    })
    expect(tokens["--spacing-line-item-feedback"]).toBe(
      "var(--spacing-form-field)"
    )
    expect(tokens["--gap-line-item-feedback"]).toBe(
      "var(--spacing-line-item-feedback)"
    )
    expect(utility("line-item-controls")).toEqual({
      "row-gap": "var(--gap-line-item-feedback)",
    })
    expect(
      utility("line-item-pending")["margin-block-start"]?.replace(/\s+/g, "")
    ).toBe("calc(var(--gap-line-item-feedback)-var(--gap-line-item))")
    expect(
      fixture(Pending)
        .querySelector('[data-part="controls"]')
        ?.classList.contains("line-item-controls")
    ).toBe(true)
  })

  it("offsets only the first narrow-row action without overriding its hitbox", () => {
    const selectors: string[] = []
    const containers: string[] = []
    css.walkAtRules("utility", (rule) => {
      if (rule.params !== "line-item-remove") {
        return
      }
      rule.walkAtRules("container", (container) => {
        containers.push(container.params)
      })
      rule.walkRules((nested) => {
        selectors.push(nested.selector)
      })
    })
    expect(containers).toEqual(["line-item (width < 32rem)"])
    expect(selectors).toEqual(['[data-part="actions"] > &:first-child'])
    expect(utility("line-item-remove")).toEqual({
      "margin-inline-start": "calc(-1 * var(--padding-button-x-sm))",
    })
    const button = remove({ className: "consumer-class" })
    for (const name of [
      "line-item-remove",
      "consumer-class",
      "p-button-sm",
      "button-size-sm",
      "focus-visible:outline-button-ring",
    ]) {
      expect(button.classList.contains(name)).toBe(true)
    }
    expect(button.getAttribute("aria-label")).toBe("Odebrat: Montážní sada M8")
  })

  it.each([
    { theme: "outlined" },
    { theme: "solid" },
    { theme: "light" },
    { theme: "unstyled" },
    { size: "md" },
    { size: "lg" },
    { size: "current" },
  ] as const)("leaves custom theme/size geometry unchanged: %j", (props) => {
    const button = remove({ ...props, className: "consumer-class" })
    expect(button.classList.contains("line-item-remove")).toBe(false)
    expect(button.classList.contains("consumer-class")).toBe(true)
    expect(button.classList.contains("focus-visible:outline-button-ring")).toBe(
      true
    )
  })

  it("keeps both pending messages, disabled controls and description targets", () => {
    const element = fixture(Pending)
    const item = query(element, '[data-scope="line-item"]')
    const status = query(item, '[data-part="pending"]')
    const input = query<HTMLInputElement>(item, "input")
    const quantityStatus = query(item, '[role="status"]')
    expect(quantityStatus.textContent).toBe("Ukládáme množství")
    expect(status.textContent).toBe("Ukládáme položku")
    expect(item.getAttribute("aria-describedby")?.split(" ")).toContain(
      status.id
    )
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(
      quantityStatus.id
    )
    expect(status.closest("[inert]")).toBeNull()
    expect(input.closest("[inert]")).not.toBeNull()
    expect(
      item.querySelector('[data-part="actions"]')?.hasAttribute("inert")
    ).toBe(true)
    expect(input.disabled).toBe(true)
    expect(
      item.querySelector<HTMLButtonElement>("button[data-part=remove]")
        ?.disabled
    ).toBe(true)
  })

  it("retains validation semantics, recovery text and product data", () => {
    const element = fixture(ItemError)
    const input = query<HTMLInputElement>(element, "input")
    const alert = query(element, '[role="alert"]')
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(input.getAttribute("aria-errormessage")).toBe(alert.id)
    expect(alert.textContent).toBe(
      "Změnu se nepodařilo uložit. Zkuste upravit množství znovu."
    )
    expect(alert.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(element.textContent).toContain("100 ks · pozink · kód MS-008")
    expect(element.textContent).toContain("498 Kč")
    expect(
      element.querySelector<HTMLButtonElement>('[data-part="remove"]')?.disabled
    ).toBe(false)
  })
})
