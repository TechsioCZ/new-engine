// @vitest-environment happy-dom
import { act, type ReactNode, StrictMode, useEffect, useState } from "react"
import { createRoot, hydrateRoot, type Root } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type ColumnDef, DataTable } from "../src/organisms/data-table"

const roots: Root[] = []
const observers = new Set<() => void>()
let narrowWidth = 64

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing compact filter fixture element")
  }
  return value
}

beforeEach(() => {
  narrowWidth = 64
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      readonly callback: () => void
      constructor(callback: () => void) {
        this.callback = callback
      }
      observe = (target: Element) => {
        if (target.classList.contains("data-table-filter-viewport")) {
          observers.add(this.callback)
        }
      }
      unobserve = vi.fn()
      disconnect = () => observers.delete(this.callback)
    }
  )
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      if (this.classList.contains("data-table-filter-viewport")) {
        return this.closest("td")?.cellIndex === 2 ? 224 : narrowWidth
      }
      return 0
    }
  )
  const style = document.createElement("style")
  // Supply only the CSS measurement that happy-dom cannot obtain from Tailwind.
  style.textContent = ".data-table-filter-control { min-width: 220px; }"
  document.head.append(style)
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
  for (const style of document.head.querySelectorAll("style")) {
    style.remove()
  }
  observers.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mount(element: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(element))
  return canvas
}

function button(canvas: ParentNode, label: string) {
  return required(
    canvas.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  )
}

function input(label: string) {
  return required(
    document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  )
}

async function change(field: HTMLInputElement, value: string) {
  await act(() => {
    required(
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    ).call(field, value)
    field.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

type Person = { age: number; visits: number; name: string }
const data: Person[] = [
  { age: 36, visits: 812, name: "Ada" },
  { age: 41, visits: 640, name: "Alan" },
]
const columns: ColumnDef<Person>[] = [
  { accessorKey: "age", header: "Age", meta: { width: 80, type: "number" } },
  {
    accessorKey: "visits",
    header: "Visits",
    meta: { width: 80, type: "number" },
  },
  { accessorKey: "name", header: "Name", meta: { width: 240 } },
]

describe("DataTable compact fixed-column filters", () => {
  it("keeps native inline filters usable when ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined)
    const onColumnFiltersChange = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        onColumnFiltersChange={onColumnFiltersChange}
        tableLayout="fixed"
      />
    )
    expect(canvas.querySelector("[data-compact]")).toBeNull()
    expect(canvas.querySelector('[aria-label="Filter Age"]')).toBeNull()
    const field = input("Filter value for Age")
    expect(
      field.closest(".data-table-filter-viewport")?.getAttribute("data-layout")
    ).toBe("fixed")
    await change(field, "36")
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith([
      { id: "age", value: { operator: "equals", value: "36" } },
    ])
    expect(canvas.querySelectorAll("tbody tr")).toHaveLength(1)
    expect(canvas.querySelector("tbody")?.textContent).toContain("Ada")
  })

  it("keeps explicit widths and one complete filter instance per column", async () => {
    const onColumnFiltersChange = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        onColumnFiltersChange={onColumnFiltersChange}
        tableLayout="fixed"
      />
    )
    expect(
      [...canvas.querySelectorAll<HTMLTableColElement>("colgroup col")].map(
        (col) => col.style.width
      )
    ).toEqual(["80px", "80px", "240px"])
    for (const header of canvas.querySelectorAll("th")) {
      expect(header.classList.contains("data-table-fixed-header")).toBe(true)
    }
    expect(canvas.querySelectorAll("[data-compact]")).toHaveLength(2)
    expect(
      canvas.querySelector('[aria-label="Filter value for Age"]')
    ).toBeNull()
    expect(
      canvas.querySelector('[aria-label="Filter value for Name"]')
    ).not.toBeNull()
    const trigger = button(canvas, "Filter Age")
    expect(trigger.classList.contains("data-table-filter-trigger")).toBe(true)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await act(() => trigger.click())
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    const field = input("Filter value for Age")
    expect(field.closest('[role="dialog"]')?.getAttribute("aria-label")).toBe(
      "Filter Age"
    )
    expect(field.closest(".popover-scroll-viewport")).not.toBeNull()
    expect(
      document.querySelectorAll('[aria-label="Filter value for Age"]')
    ).toHaveLength(1)
    await change(field, "36")
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith([
      { id: "age", value: { operator: "equals", value: "36" } },
    ])
    expect(canvas.querySelectorAll("tbody tr")).toHaveLength(1)
    expect(canvas.querySelector("tbody")?.textContent).toContain("Ada")
    expect(field.value).toBe("36")
    expect(trigger.getAttribute("data-active")).toBe("true")
    const condition = button(document, "Filter condition for Age: =")
    expect(condition.disabled).toBe(false)
    await act(() => trigger.click())
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await act(() => trigger.click())
    expect(input("Filter value for Age")).toBe(field)
    expect(field.value).toBe("36")
  })

  it("keeps conditions and both range bounds usable in the compact popup", async () => {
    const onColumnFiltersChange = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        onColumnFiltersChange={onColumnFiltersChange}
        tableLayout="fixed"
      />
    )
    const trigger = button(canvas, "Filter Age")
    await act(() => trigger.click())
    await change(input("Filter value for Age"), "36")
    await act(() => button(document, "Filter condition for Age: =").click())
    const between = required(
      [
        ...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
      ].find((item) => item.textContent === "Between")
    )
    await act(() => between.click())
    const upper = input("Filter upper bound for Age")
    await change(upper, "40")
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith([
      { id: "age", value: { operator: "between", value: "36", to: "40" } },
    ])
    expect(input("Filter value for Age").value).toBe("36")
    expect(upper.value).toBe("40")
    expect(button(document, "Filter condition for Age: Between").disabled).toBe(
      false
    )
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(canvas.querySelectorAll("tbody tr")).toHaveLength(1)
    await act(() => trigger.click())
    await act(() => trigger.click())
    expect(input("Filter upper bound for Age")).toBe(upper)
    expect(upper.value).toBe("40")
  })

  it.each([64, 260])(
    "preserves one custom filter mount and local draft across both layouts from width %s",
    async (initialWidth) => {
      narrowWidth = initialWidth
      const mounted = vi.fn()
      const unmounted = vi.fn()
      function DraftFilter() {
        const [draft, setDraft] = useState("")
        useEffect(() => {
          mounted()
          return unmounted
        }, [])
        return (
          <>
            <input aria-label="Custom lower" defaultValue="lower draft" />
            <input
              aria-label="Custom draft"
              onChange={(event) => setDraft(event.target.value)}
              value={draft}
            />
          </>
        )
      }
      const canvas = await mount(
        <DataTable
          columns={columns}
          data={data}
          enableColumnFilters
          renderHeaderFilter={(column) =>
            column.id === "age" ? <DraftFilter /> : null
          }
          tableLayout="fixed"
        />
      )
      if (initialWidth === 64) {
        await act(() => button(canvas, "Filter Age").click())
      }
      const field = input("Custom draft")
      await change(field, "unfinished draft")
      await act(() => {
        field.focus()
        field.setSelectionRange(2, 9, "backward")
      })
      expect(mounted).toHaveBeenCalledTimes(1)
      for (const width of initialWidth === 64 ? [260, 64] : [64, 260]) {
        narrowWidth = width
        await act(() => {
          for (const notify of [...observers]) {
            notify()
          }
        })
        if (width === 64) {
          await act(
            () =>
              new Promise<void>((resolve) => {
                requestAnimationFrame(() => resolve())
              })
          )
          expect(
            button(canvas, "Filter Age").getAttribute("aria-expanded")
          ).toBe("true")
          expect(field.closest('[role="dialog"]')).not.toBeNull()
        } else {
          expect(canvas.contains(field)).toBe(true)
          expect(canvas.querySelector('[aria-label="Filter Age"]')).toBeNull()
        }
        expect(input("Custom draft")).toBe(field)
        expect(field.value).toBe("unfinished draft")
        expect(document.activeElement).toBe(field)
        expect(field.selectionStart).toBe(2)
        expect(field.selectionEnd).toBe(9)
        expect(field.selectionDirection).toBe("backward")
        expect(mounted).toHaveBeenCalledTimes(1)
        expect(unmounted).not.toHaveBeenCalled()
        expect(
          document.querySelectorAll('[aria-label="Custom draft"]')
        ).toHaveLength(1)
      }
    }
  )

  it("keeps the default multi-select query when moving between inline and popup", async () => {
    narrowWidth = 260
    const canvas = await mount(
      <DataTable
        columns={[
          {
            accessorKey: "name",
            header: "Name",
            meta: {
              width: 80,
              type: "multiEnum",
              options: [
                { label: "Ada", value: "Ada" },
                { label: "Alan", value: "Alan" },
              ],
            },
          },
        ]}
        data={data}
        enableColumnFilters
        tableLayout="fixed"
      />
    )
    const field = required(
      canvas.querySelector<HTMLInputElement>('input[placeholder="Filter Name"]')
    )
    await change(field, "Ad")
    expect(field.value).toBe("Ad")
    for (const width of [64, 260]) {
      narrowWidth = width
      await act(() => {
        for (const notify of [...observers]) {
          notify()
        }
      })
      if (width === 64) {
        const trigger = button(canvas, "Filter Name")
        if (trigger.getAttribute("aria-expanded") === "false") {
          await act(() => trigger.click())
        }
        expect(field.closest('[role="dialog"]')).not.toBeNull()
      } else {
        expect(canvas.contains(field)).toBe(true)
      }
      expect(document.querySelector('input[placeholder="Filter Name"]')).toBe(
        field
      )
      expect(field.value).toBe("Ad")
    }
  })

  it("hydrates without replacing a custom draft and cleans up after strict lifecycle replay", async () => {
    const mounted = vi.fn()
    const unmounted = vi.fn()
    function DraftFilter() {
      const [draft, setDraft] = useState("")
      useEffect(() => {
        mounted()
        return unmounted
      }, [])
      return (
        <input
          aria-label="Hydrated draft"
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />
      )
    }
    const element = (
      <StrictMode>
        <DataTable
          columns={columns}
          data={data}
          enableColumnFilters
          renderHeaderFilter={(column) =>
            column.id === "age" ? <DraftFilter /> : null
          }
          tableLayout="fixed"
        />
      </StrictMode>
    )
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToString(element)
    document.body.append(canvas)
    const onRecoverableError = vi.fn()
    await act(() => {
      roots.push(hydrateRoot(canvas, element, { onRecoverableError }))
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    await act(() => button(canvas, "Filter Age").click())
    const field = input("Hydrated draft")
    await change(field, "hydrated draft")
    const mountsAfterReplay = mounted.mock.calls.length
    expect(mountsAfterReplay).toBeGreaterThan(0)
    narrowWidth = 260
    await act(() => {
      for (const notify of [...observers]) {
        notify()
      }
    })
    expect(input("Hydrated draft")).toBe(field)
    expect(field.value).toBe("hydrated draft")
    expect(mounted).toHaveBeenCalledTimes(mountsAfterReplay)
    narrowWidth = 64
    await act(() => {
      for (const notify of [...observers]) {
        notify()
      }
    })
    const trigger = button(canvas, "Filter Age")
    if (trigger.getAttribute("aria-expanded") === "false") {
      await act(() => trigger.click())
    }
    expect(field.closest('[role="dialog"]')).not.toBeNull()
    expect(mounted).toHaveBeenCalledTimes(mountsAfterReplay)
    await act(() => required(roots.pop()).unmount())
    expect(unmounted).toHaveBeenCalledTimes(mountsAfterReplay)
    expect(document.querySelector('[aria-label="Hydrated draft"]')).toBeNull()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(observers.size).toBe(0)
  })

  it.each(["number", "dateRange", "time"] as const)(
    "keeps the exact %s upper endpoint focused when returning inline",
    async (type) => {
      const canvas = await mount(
        <DataTable
          columnFilters={[
            {
              id: "age",
              value:
                type === "number"
                  ? { operator: "between", value: "36", to: "40" }
                  : {
                      from: type === "time" ? "09:00" : "2026-11-01",
                      to: type === "time" ? "17:00" : "2026-11-07",
                    },
            },
          ]}
          columns={[
            { accessorKey: "age", header: "Age", meta: { width: 80, type } },
          ]}
          data={data}
          enableColumnFilters
          tableLayout="fixed"
        />
      )
      await act(() => button(canvas, "Filter Age").click())
      const upper = input(
        type === "number" ? "Filter upper bound for Age" : "Filter Age to"
      )
      await act(() => upper.focus())
      expect(document.activeElement).toBe(upper)
      narrowWidth = 260
      await act(() => {
        for (const notify of [...observers]) {
          notify()
        }
      })
      expect(canvas.contains(upper)).toBe(true)
      expect(document.activeElement).toBe(upper)
    }
  )

  it("returns to inline controls after resizing without losing filter values", async () => {
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        tableLayout="fixed"
      />
    )
    await act(() => button(canvas, "Filter Age").click())
    await change(input("Filter value for Age"), "36")
    await act(() => input("Filter value for Age").focus())
    narrowWidth = 260
    await act(() => {
      for (const notify of [...observers]) {
        notify()
      }
    })
    expect(canvas.querySelector("[data-compact]")).toBeNull()
    expect(canvas.querySelector('[aria-label="Filter Age"]')).toBeNull()
    expect(
      canvas.querySelector<HTMLInputElement>(
        '[aria-label="Filter value for Age"]'
      )?.value
    ).toBe("36")
    expect(canvas.querySelectorAll("tbody tr")).toHaveLength(1)
    expect(document.activeElement).toBe(input("Filter value for Age"))
  })

  it("leaves auto-layout filters inline", async () => {
    const canvas = await mount(
      <DataTable columns={columns} data={data} enableColumnFilters />
    )
    expect(canvas.querySelector(".data-table-fixed-header")).toBeNull()
    expect(canvas.querySelector("[data-compact]")).toBeNull()
    expect(
      canvas.querySelector('[aria-label="Filter value for Age"]')
    ).not.toBeNull()
    expect(
      canvas.querySelector('[aria-label="Filter condition for Age: ="]')
    ).not.toBeNull()
  })

  it("preserves custom header slots and intentional null filters", async () => {
    const onColumnFiltersChange = vi.fn()
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnFilters
        onColumnFiltersChange={onColumnFiltersChange}
        renderHeaderFilter={(column) =>
          column.id === "age" ? (
            <input
              aria-label="Custom age"
              onChange={(event) => column.setFilterValue(event.target.value)}
              value={(column.getFilterValue() as string) ?? ""}
            />
          ) : null
        }
        tableLayout="fixed"
      />
    )
    expect(canvas.querySelector('[aria-label="Filter Visits"]')).toBeNull()
    await act(() => button(canvas, "Filter Age").click())
    await change(input("Custom age"), "36")
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith([
      { id: "age", value: "36" },
    ])
    expect(canvas.querySelectorAll("tbody tr")).toHaveLength(1)
  })

  it("disables compact triggers and their controls while an edit locks filtering", async () => {
    const canvas = await mount(
      <DataTable
        columns={columns.map((column) => ({
          ...column,
          meta: { ...column.meta, editable: true },
        }))}
        data={data}
        enableColumnFilters
        enableInlineEdit
        tableLayout="fixed"
      />
    )
    await act(() => button(canvas, "Filter Age").click())
    await act(() => button(canvas, "Edit row 0").click())
    expect(button(canvas, "Filter Age").disabled).toBe(true)
    expect(button(canvas, "Filter Age").getAttribute("aria-expanded")).toBe(
      "false"
    )
    expect(input("Filter value for Age").disabled).toBe(true)
    expect(button(document, "Filter condition for Age: =").disabled).toBe(true)
    await act(() => button(canvas, "Cancel edit").click())
    expect(button(canvas, "Filter Age").disabled).toBe(false)
    expect(button(canvas, "Filter Age").getAttribute("aria-expanded")).toBe(
      "false"
    )
  })
})
