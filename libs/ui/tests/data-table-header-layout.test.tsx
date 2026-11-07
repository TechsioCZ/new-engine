// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { URL as NodeURL } from "node:url"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type ColumnDef, DataTable } from "../src/organisms/data-table"

const roots: Root[] = []
const tokens = readFileSync(
  new NodeURL(
    "../src/tokens/components/organisms/_data-table.css",
    import.meta.url
  ),
  "utf8"
)

type Person = { firstName: string; visits: number }
const data: Person[] = [
  { firstName: "Ada", visits: 812 },
  { firstName: "Alan", visits: 640 },
]
const columns: ColumnDef<Person>[] = [
  { accessorKey: "firstName", header: "First name", meta: { width: 120 } },
  { accessorKey: "visits", header: "Visits", meta: { width: 80 } },
]

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing header-layout fixture element")
  }
  return value
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
    }
  )
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
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

function header(canvas: ParentNode, id: string) {
  return required(
    canvas.querySelector<HTMLTableCellElement>(`th[data-leaf-column="${id}"]`)
  )
}

function utility(name: string) {
  return required(tokens.match(new RegExp(`@utility ${name} \\{([^}]+)\\}`)))[1]
}

describe("DataTable fixed header layout", () => {
  // These are structural contracts, not native font/geometry measurements.
  for (const size of ["sm", "md", "lg"] as const) {
    for (const dir of ["ltr", "rtl"]) {
      it.each([false, "asc", "desc"] as const)(
        `keeps complete labels and a stable indicator at ${size}/${dir}/%s`,
        async (direction) => {
          const canvas = await mount(
            <div dir={dir}>
              <DataTable
                columns={columns}
                data={data}
                size={size}
                sorting={
                  direction
                    ? [{ id: "visits", desc: direction === "desc" }]
                    : []
                }
                tableLayout="fixed"
              />
            </div>
          )
          expect(
            Array.from(canvas.querySelectorAll("col"), (col) => col.style.width)
          ).toEqual(["120px", "80px"])
          for (const [id, label] of [
            ["firstName", "First name"],
            ["visits", "Visits"],
          ]) {
            const cell = header(canvas, required(id))
            const button = required(cell.querySelector("button"))
            const text = required(button.firstElementChild)
            const icon = required(button.lastElementChild)
            expect(cell.classList.contains("data-table-fixed-header")).toBe(
              true
            )
            expect(
              button.parentElement?.classList.contains(
                "data-table-header-label"
              )
            ).toBe(true)
            expect(button.classList.contains("flex-nowrap")).toBe(true)
            expect(button.classList.contains("flex-wrap")).toBe(false)
            expect(button.classList.contains("gap-data-table-sort-label")).toBe(
              true
            )
            expect(text.textContent).toBe(label)
            expect(text.classList.contains("whitespace-normal")).toBe(true)
            expect(text.classList.contains("wrap-break-word")).toBe(true)
            expect(text.classList.contains("min-w-0")).toBe(true)
            for (const forbidden of [
              "truncate",
              "shrink-0",
              "break-all",
              "wrap-anywhere",
            ]) {
              expect(text.classList.contains(forbidden)).toBe(false)
            }
            expect(icon.classList.contains("data-table-sort-indicator")).toBe(
              true
            )
            expect(icon.getAttribute("aria-hidden")).toBe("true")
            expect(cell.scope).toBe("col")
            const bodyCell = required(
              canvas.querySelector<HTMLTableCellElement>(
                `tbody tr:first-child td[headers="${cell.id}"]`
              )
            )
            expect(bodyCell.headers).toBe(cell.id)
          }
          const visits = header(canvas, "visits")
          expect(visits.style.width).toBe("80px")
          expect(visits.getAttribute("aria-sort")).toBe(
            direction === "asc"
              ? "ascending"
              : direction === "desc"
                ? "descending"
                : "none"
          )
          const icon = required(visits.querySelector("button > :last-child"))
          expect(icon.getAttribute("data-active")).toBe(String(!!direction))
          expect(
            icon.classList.contains(
              direction === "asc"
                ? "token-icon-chevron-up"
                : direction === "desc"
                  ? "token-icon-chevron-down"
                  : "icon-[mdi--unfold-more-horizontal]"
            )
          ).toBe(true)
        }
      )
    }
  }

  it("preserves the sort toggle, focus and indicator node through the full cycle", async () => {
    const canvas = await mount(
      <DataTable columns={columns} data={data} tableLayout="fixed" />
    )
    const cell = header(canvas, "firstName")
    const button = required(cell.querySelector("button"))
    const icon = required(button.lastElementChild)
    await act(() => button.focus())
    for (const state of ["ascending", "descending", "none"]) {
      await act(() => button.click())
      expect(cell.getAttribute("aria-sort")).toBe(state)
      expect(button.lastElementChild).toBe(icon)
      expect(document.activeElement).toBe(button)
      expect(button.textContent).toBe("First name")
      expect(header(canvas, "visits").style.width).toBe("80px")
    }
  })

  it.each([true, false])(
    "wraps a complete custom unsortable label (global sorting: %s)",
    async (enableSorting) => {
      const canvas = await mount(
        <DataTable
          columns={[
            {
              accessorKey: "firstName",
              header: () => <span>Complete custom header label</span>,
              enableSorting: false,
              meta: { width: 80 },
            },
          ]}
          data={data}
          enableSorting={enableSorting}
          tableLayout="fixed"
        />
      )
      const cell = header(canvas, "firstName")
      const text = required(cell.querySelector("div > span"))
      expect(text.textContent).toBe("Complete custom header label")
      expect(text.classList.contains("whitespace-normal")).toBe(true)
      expect(text.classList.contains("truncate")).toBe(false)
      expect(cell.querySelector("button")).toBeNull()
      expect(cell.style.width).toBe("80px")
    }
  )

  it("leaves auto-layout header typography and intrinsic sizing alone", async () => {
    const canvas = await mount(<DataTable columns={columns} data={data} />)
    expect(canvas.querySelector(".data-table-fixed-header")).toBeNull()
    expect(canvas.querySelector(".data-table-header-label")).toBeNull()
    expect(canvas.querySelector(".data-table-sort-indicator")).toBeNull()
    const button = required(header(canvas, "visits").querySelector("button"))
    expect(button.classList.contains("whitespace-nowrap")).toBe(true)
    expect(button.textContent).toBe("Visits")
  })
})

describe("DataTable header token contracts", () => {
  it("uses a compact type reference without enlarging smaller inherited header text", () => {
    expect(tokens).toContain("--text-data-table-header: var(--text-table-sm);")
    expect(tokens).toContain(
      "--text-data-table-header-label: var(--text-data-table-header);"
    )
    expect(utility("data-table-header-label")).toContain(
      "font-size: min(1em, var(--text-data-table-header-label));"
    )
  })

  it("reserves a constant, nonshrinking indicator box for every sort glyph", () => {
    expect(tokens).toContain(
      "--spacing-data-table-sort-icon: var(--dimension-12);"
    )
    expect(tokens).toContain(
      "--size-data-table-sort-indicator: var(--spacing-data-table-sort-icon);"
    )
    expect(tokens).toContain(
      "--spacing-data-table-sort-gap: var(--spacing-50);"
    )
    expect(tokens).toContain(
      "--gap-data-table-sort-label: var(--spacing-data-table-sort-gap);"
    )
    const indicator = utility("data-table-sort-indicator")
    expect(indicator).toContain("flex-shrink: 0;")
    expect(indicator).toContain(
      "inline-size: var(--size-data-table-sort-indicator);"
    )
    expect(indicator).toContain(
      "block-size: var(--size-data-table-sort-indicator);"
    )
    expect(indicator).toContain(
      "font-size: var(--size-data-table-sort-indicator);"
    )
    expect(indicator).not.toMatch(
      /display:\s*none|visibility:\s*hidden|overflow:\s*hidden/
    )
    expect(utility("data-table-fixed-header")).toContain(
      "padding-inline: var(--padding-data-table-header-inline);"
    )
  })
})
