// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  type ColumnDef,
  DataTable,
  type TanstackTable,
} from "../src/organisms/data-table"

const roots: Root[] = []
const WHITESPACE_RE = /\s+/

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing grouped-header fixture element")
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
  vi.restoreAllMocks()
})

async function mount(element: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(element))
  return canvas
}

type Person = { firstName: string; lastName: string; email: string }
const data: Person[] = [
  { firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" },
  { firstName: "Grace", lastName: "Hopper", email: "grace@example.test" },
]
const columns: ColumnDef<Person, unknown>[] = [
  {
    id: "identity",
    header: "Identity",
    columns: [
      { accessorKey: "firstName", header: "First name", meta: { width: 200 } },
      { accessorKey: "lastName", header: "Last name", meta: { width: 200 } },
    ],
  },
  { accessorKey: "email", header: "Email", meta: { width: 900 } },
]

function leaf(canvas: HTMLElement, id: string) {
  return required(
    canvas.querySelector<HTMLTableCellElement>(`th[data-leaf-column="${id}"]`)
  )
}

function headerReferences(cell: HTMLTableCellElement) {
  return required(cell.getAttribute("headers"))
    .split(WHITESPACE_RE)
    .map((id) => {
      const header = required(document.getElementById(id))
      if (
        header.tagName !== "TH" ||
        header.closest("table") !== cell.closest("table") ||
        header.hasAttribute("aria-hidden")
      ) {
        throw new Error(`Invalid table header reference: ${id}`)
      }
      return header
    })
}

function labels(cell: HTMLTableCellElement) {
  return headerReferences(cell).map((header) => header.textContent)
}

function bodyCells(canvas: HTMLElement) {
  return Array.from(
    canvas.querySelectorAll<HTMLTableCellElement>("tbody tr:first-child > td")
  )
}

function headerSemantics(canvas: HTMLElement) {
  const placeholders = Array.from(
    canvas.querySelectorAll<HTMLTableCellElement>("thead td[data-leaf-column]")
  )
  return {
    placeholders: placeholders.length,
    neutral: placeholders.every(
      (cell) =>
        cell.textContent === "" &&
        cell.querySelector("button") === null &&
        ["scope", "aria-sort", "aria-label", "aria-hidden", "id"].every(
          (attribute) => !cell.hasAttribute(attribute)
        )
    ),
    namedHeaders: Array.from(canvas.querySelectorAll("thead th")).every(
      (header) =>
        Boolean(header.textContent?.trim()) &&
        !header.hasAttribute("aria-hidden")
    ),
  }
}

describe("DataTable grouped-header semantics", () => {
  it("keeps the mixed-depth fixed-width grid without an unnamed Email header", async () => {
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnResizing
        tableLayout="fixed"
      />
    )
    const rows = canvas.querySelectorAll("thead tr")
    expect(rows).toHaveLength(2)
    expect(rows[0]?.children).toHaveLength(2)
    expect(rows[1]?.children).toHaveLength(3)
    expect(headerSemantics(canvas)).toEqual({
      placeholders: 1,
      neutral: true,
      namedHeaders: true,
    })
    const group = required(rows[0]?.querySelector("th"))
    expect(group.textContent).toBe("Identity")
    expect(group.colSpan).toBe(2)
    // A visual label group is not the single sizing colgroup spanning all leaves.
    expect(group.hasAttribute("scope")).toBe(false)
    expect(canvas.querySelectorAll("th[data-leaf-column=email]")).toHaveLength(
      1
    )
    for (const id of ["firstName", "lastName", "email"]) {
      expect(leaf(canvas, id).scope).toBe("col")
    }
    expect(bodyCells(canvas).map(labels)).toEqual([
      ["Identity", "First name"],
      ["Identity", "Last name"],
      ["Email"],
    ])
    expect(
      Array.from(canvas.querySelectorAll("col"), (col) => col.style.width)
    ).toEqual(["200px", "200px", "900px"])
    expect(
      required(canvas.querySelector<HTMLTableCellElement>("thead td")).style
        .width
    ).toBe("900px")
    expect(leaf(canvas, "email").style.width).toBe("900px")
  })

  it("associates nested groups and ignores every alignment placeholder", async () => {
    const canvas = await mount(
      <DataTable
        columns={[
          { id: "person", header: "Person", columns: [required(columns[0])] },
          required(columns[1]),
        ]}
        data={data}
      />
    )
    expect(headerSemantics(canvas)).toEqual({
      placeholders: 2,
      neutral: true,
      namedHeaders: true,
    })
    expect(bodyCells(canvas).map(labels)).toEqual([
      ["Person", "Identity", "First name"],
      ["Person", "Identity", "Last name"],
      ["Email"],
    ])
  })

  it("rebuilds exact group-fragment associations after reorder, pinning and visibility changes", async () => {
    let table: TanstackTable<Person> | undefined
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnPinning
        enableColumnReorder
        onReady={(ready) => {
          table = ready
        }}
      />
    )
    await act(() =>
      required(table).setColumnOrder(["firstName", "email", "lastName"])
    )
    expect(bodyCells(canvas).map(labels)).toEqual([
      ["Identity", "First name"],
      ["Email"],
      ["Identity", "Last name"],
    ])
    const [first, , last] = bodyCells(canvas)
    expect(headerReferences(required(first))[0]).not.toBe(
      headerReferences(required(last))[0]
    )
    await act(() =>
      required(table).setColumnPinning({ start: ["lastName"], end: [] })
    )
    expect(bodyCells(canvas).map(labels)).toEqual([
      ["Identity", "Last name"],
      ["Identity", "First name"],
      ["Email"],
    ])
    await act(() => required(table).setColumnVisibility({ firstName: false }))
    expect(bodyCells(canvas).map(labels)).toEqual([
      ["Identity", "Last name"],
      ["Email"],
    ])
    const ids = Array.from(
      canvas.querySelectorAll("thead th[id]"),
      (header) => header.id
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(headerSemantics(canvas)).toEqual({
      placeholders: 1,
      neutral: true,
      namedHeaders: true,
    })
  })

  it("keeps sorting and keyboard resizing only on the real leaf header", async () => {
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        enableColumnResizing
        stickyHeader
        tableLayout="fixed"
      />
    )
    const email = leaf(canvas, "email")
    const placeholder = required(
      canvas.querySelector<HTMLTableCellElement>("thead td")
    )
    expect(placeholder.classList.contains("sticky")).toBe(true)
    expect(placeholder.classList.contains("z-10")).toBe(true)
    expect(placeholder.style.top).toBe("0px")
    expect(placeholder.style.backgroundImage).toBe(email.style.backgroundImage)
    const sort = required(
      email.querySelector<HTMLButtonElement>("button:not([aria-label])")
    )
    await act(() => sort.click())
    expect(email.getAttribute("aria-sort")).toBe("ascending")
    await act(() => sort.click())
    expect(email.getAttribute("aria-sort")).toBe("descending")
    expect(bodyCells(canvas)[0]?.textContent).toBe("Grace")
    const resize = required(
      email.querySelector<HTMLButtonElement>(
        'button[aria-label="Resize Email"]'
      )
    )
    // happy-dom has no layout; keyboard resize deliberately starts from the
    // rendered cell width, rather than the numeric column model fallback.
    vi.spyOn(email, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 900, 40)
    )
    await act(() =>
      resize.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
      )
    )
    expect(email.style.width).toBe("910px")
    expect(placeholder.style.width).toBe("910px")
    expect(
      Array.from(canvas.querySelectorAll("col"), (col) => col.style.width)
    ).toEqual(["200px", "200px", "910px"])
    expect(headerSemantics(canvas)).toEqual({
      placeholders: 1,
      neutral: true,
      namedHeaders: true,
    })
  })

  it("links spanning body cells to all covered leaf headers, once per group", async () => {
    const canvas = await mount(
      <DataTable
        columns={columns}
        data={data}
        getCellSpan={(cell) => {
          if (cell.column.id === "firstName") {
            return { colSpan: 2 }
          }
          if (cell.column.id === "lastName") {
            return { hidden: true }
          }
          return {}
        }}
      />
    )
    expect(bodyCells(canvas).map(labels)).toEqual([
      ["Identity", "First name", "Last name"],
      ["Email"],
    ])
  })

  it("keeps flat custom leaf names and instance-local header references", async () => {
    const flat: ColumnDef<Person, unknown>[] = [
      { accessorKey: "email", header: () => <span>Contact address</span> },
    ]
    const canvas = await mount(
      <>
        <DataTable columns={flat} data={data} />
        <DataTable columns={flat} data={data} />
      </>
    )
    const cells = canvas.querySelectorAll<HTMLTableCellElement>(
      "tbody tr:first-child td"
    )
    expect(cells).toHaveLength(2)
    expect(Array.from(cells, labels)).toEqual([
      ["Contact address"],
      ["Contact address"],
    ])
    expect(cells[0]?.headers).not.toBe(cells[1]?.headers)
    expect(canvas.querySelector("thead td")).toBeNull()
  })
})
