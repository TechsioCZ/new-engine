// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss from "postcss"
import { act, type ComponentType, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Table } from "../src/organisms/table"
import meta, {
  Interactive,
  Playground,
  Sizes,
  WithStickyColumn,
} from "../stories/organisms/table.stories"

const roots: Root[] = []
const observers: ResizeObserverMock[] = []
const cssFile = "../src/tokens/components/organisms/_table.css"
const css = postcss.parse(
  readFileSync(new URL(cssFile, import.meta.url), "utf8")
)

class ResizeObserverMock {
  readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    observers.push(this)
  }

  observe = vi.fn()
  disconnect = vi.fn()
}

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing Table repair fixture")
  }
  return value
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal("ResizeObserver", ResizeObserverMock)
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  observers.length = 0
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

async function mount(children: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(children))
  return canvas
}

function storyElement(story: typeof Playground) {
  const Example = story.render as ComponentType
  return <Example {...story.args} />
}

function utility(name: string) {
  let result: postcss.AtRule | undefined
  css.walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      result = rule
    }
  })
  return required(result)
}

describe("Table review repairs", () => {
  it("insets the measured overflow hint without changing native scrolling", async () => {
    const decorators = meta.decorators
    const decorate = required(
      Array.isArray(decorators) ? decorators[0] : decorators
    )
    const canvas = await mount(
      decorate(
        (() => storyElement(Playground)) as never,
        { parameters: {} } as never
      )
    )
    const region = required(
      canvas.querySelector<HTMLElement>('[role="region"]')
    )
    Object.defineProperties(region, {
      clientWidth: { configurable: true, value: 361 },
      scrollWidth: { configurable: true, value: 440 },
    })
    await act(() => {
      required(observers[0]).callback([], {} as ResizeObserver)
    })
    const hint = required(
      document.getElementById(required(region.getAttribute("aria-describedby")))
    )
    expect(hint.textContent).toBe("Scroll horizontally to view all columns.")
    expect(hint.classList.contains("px-(--padding-table-cell-md-x)")).toBe(true)
    expect(hint.classList.contains("pt-100")).toBe(true)
    expect(region.classList.contains("overflow-x-auto")).toBe(true)
    expect(region.tabIndex).toBe(0)
  })

  it("keeps all three size tables in one consistently spaced matrix", async () => {
    const canvas = await mount(storyElement(Sizes))
    const tables = Array.from(canvas.querySelectorAll("table"))
    expect(tables).toHaveLength(3)
    const matrix = required(tables[0]?.parentElement)
    expect(matrix.classList.contains("gap-300")).toBe(true)
    expect(tables.every((table) => table.parentElement === matrix)).toBe(true)
    for (const [index, size] of ["sm", "md", "lg"].entries()) {
      expect(tables[index]?.querySelector("td")?.className).toContain(
        `p-table-cell-${size}`
      )
      expect(tables[index]?.querySelectorAll("tbody tr")).toHaveLength(3)
    }
  })

  it("preserves the bounded sticky-column stress demo and complete SKU", async () => {
    const canvas = await mount(storyElement(WithStickyColumn))
    const region = required(canvas.querySelector('[role="region"]'))
    expect(region.parentElement?.classList.contains("max-w-lg")).toBe(true)
    expect(canvas.textContent).toContain("SKU-123456")
    expect(canvas.textContent).toContain(
      "Scroll horizontally - first column stays fixed"
    )
    expect(canvas.querySelectorAll("thead th")).toHaveLength(8)
    const firstCell = required(canvas.querySelector("tbody td"))
    expect(firstCell.classList.contains("first:sticky")).toBe(true)
    expect(firstCell.classList.contains("first:table-frozen-cell")).toBe(true)
  })

  it("retains click, Enter and Space activation and selected-row semantics", async () => {
    const canvas = await mount(storyElement(Interactive))
    const rows = Array.from(
      canvas.querySelectorAll<HTMLTableRowElement>("tbody tr")
    )
    const [first, second, third] = rows.map(required)
    await act(() => required(first).click())
    expect(first?.getAttribute("aria-selected")).toBe("true")
    await act(() => {
      required(second).focus()
      second?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })
    expect(second?.getAttribute("aria-selected")).toBe("true")
    expect(document.activeElement).toBe(second)
    await act(() => {
      required(third).focus()
      third?.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true })
      )
    })
    expect(third?.getAttribute("data-selected")).toBe("true")
    expect(document.activeElement).toBe(third)
    expect(first?.getAttribute("aria-selected")).toBe("false")
    expect(first?.classList.contains("table-row-interactive")).toBe(true)
    expect(first?.className).not.toContain("focus-visible:outline-")
    expect(
      canvas.querySelector("thead")?.classList.contains("bg-table-header-bg")
    ).toBe(true)
  })

  it("does not turn a nested control's keyboard input into row activation", async () => {
    const activate = vi.fn()
    const canvas = await mount(
      <Table interactive>
        <Table.Body>
          <Table.Row onClick={activate}>
            <Table.Cell>
              <input aria-label="Quantity" />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    )
    await act(() => {
      required(canvas.querySelector("input")).dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true })
      )
    })
    expect(activate).not.toHaveBeenCalled()
  })

  it.each(["line", "outline", "striped"] as const)(
    "retains %s borders, sticky layers, numeric alignment and selected cells",
    async (variant) => {
      const canvas = await mount(
        <Table
          interactive
          showColumnBorder
          stickyFirstColumn
          stickyHeader
          variant={variant}
        >
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader numeric>Count</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row selected>
              <Table.Cell numeric>3</Table.Cell>
            </Table.Row>
          </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.Cell numeric>3</Table.Cell>
            </Table.Row>
          </Table.Footer>
        </Table>
      )
      const header = required(canvas.querySelector("th"))
      const cell = required(canvas.querySelector("tbody td"))
      expect(header.className).toContain("first:z-20")
      expect(header.classList.contains("z-10")).toBe(true)
      expect(cell.className).toContain("first:z-10")
      expect(cell.className).toContain("border-e-(length:--border-table-width)")
      expect(cell.getAttribute("data-numeric")).toBe("true")
      expect(cell.parentElement?.getAttribute("data-selected")).toBe("true")
      expect(canvas.querySelector("tfoot")?.className).toContain(
        "bg-table-footer-bg"
      )
      expect(canvas.querySelector("table")?.className).toContain(
        "border-collapse"
      )
    }
  )

  it("paints the frozen divider inside its opaque cell without losing state tints", () => {
    const frozen = utility("table-frozen-cell")
    const declarations = new Map<string, string>()
    frozen.walkDecls((declaration) => {
      declarations.set(declaration.prop, declaration.value)
    })
    expect(declarations.get("box-shadow")).toBe(
      "inset 0 calc(-1 * var(--border-table-width)) 0\n    var(--color-table-border)"
    )
    expect(declarations.get("border-block-end")).toContain(
      "var(--border-table-width)"
    )
    expect(declarations.get("background-color")).toBe("var(--color-table-bg)")
    expect(frozen.toString()).toContain('tr[data-selected="true"] > &')
    expect(frozen.toString()).toContain("var(--table-row-tint, transparent)")
  })

  it("paints focus on cells with RTL edges and a forced-colors fallback, not row geometry", () => {
    const interactive = utility("table-row-interactive")
    const selectors: string[] = []
    const properties: string[] = []
    interactive.walkRules((rule) => {
      selectors.push(rule.selector)
    })
    interactive.walkDecls((declaration) => {
      properties.push(declaration.prop)
    })
    expect(selectors).toContain("&:focus-visible")
    expect(selectors).toContain("& > :is(td, th)::before")
    expect(selectors).toContain("& > :first-child::before")
    expect(selectors).toContain("& > :last-child::before")
    expect(properties).toContain("border-inline-start")
    expect(properties).toContain("border-inline-end")
    expect(properties).toContain("border-block")
    expect(properties).not.toContain("box-shadow")
    expect(interactive.toString()).toContain("pointer-events: none")
    expect(properties).not.toContain("padding")
    expect(properties).not.toContain("margin")
    expect(properties).not.toContain("height")
    expect(properties).not.toContain("display")
    expect(interactive.toString()).toContain("(forced-colors: active)")
    expect(interactive.toString()).toContain(
      "--table-row-focus-color: Highlight"
    )
  })
})
