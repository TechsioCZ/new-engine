// @vitest-environment happy-dom
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"
import type { UiMessagesInput } from "../src/messages/ui-messages"
import { UiMessagesProvider } from "../src/messages/ui-messages-provider"
import {
  type ColumnDef,
  DataTable,
  type DataTableProps,
} from "../src/organisms/data-table"

const mounted: { container: HTMLElement; root: Root }[] = []

function render(node: ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  act(() => root.render(node))
  return container
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
})

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)

type Row = { id: string; name: string; active: boolean }

const data: Row[] = [
  { id: "a", name: "Ada", active: true },
  { id: "b", name: "Alan", active: false },
]

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name", meta: { editable: true } },
  {
    accessorKey: "active",
    header: "Active",
    meta: { type: "boolean", editable: true },
  },
]

const ariaLabels = (container: HTMLElement) =>
  [...container.querySelectorAll("[aria-label]")].map(
    (el) => el.getAttribute("aria-label") ?? ""
  )

const placeholders = (container: HTMLElement) =>
  [...container.querySelectorAll("[placeholder]")].map(
    (el) => el.getAttribute("placeholder") ?? ""
  )

function renderTable(
  props: Partial<DataTableProps<Row>> = {},
  provider?: UiMessagesInput
) {
  const table = (
    <DataTable<Row>
      columns={columns}
      data={data}
      enableColumnFilters
      enableColumnResizing
      enableRowReorder
      enableRowSelection
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.original.name}
      {...props}
    />
  )
  return render(
    provider ? (
      <UiMessagesProvider messages={provider}>{table}</UiMessagesProvider>
    ) : (
      table
    )
  )
}

const czech: UiMessagesInput = {
  dataTable: {
    selectRowLabel: (rowLabel) => `Vybrat ${rowLabel}`,
    selectAllLabel: "Vybrat vše",
    filterLabel: (column) => `Filtr ${column}`,
    filterValueLabel: (column) => `Hodnota filtru pro ${column}`,
    filterConditionValueLabel: ({ column, condition }) =>
      `${column}: ${condition}`,
    filterValuePlaceholder: "Hodnota",
    filterAllLabel: "Vše",
    booleanTrueLabel: "Ano",
    booleanFalseLabel: "Ne",
    operatorLabels: { contains: "Obsahuje" },
    dragHandleLabel: (label) => `Přetáhnout ${label}`,
    resizeColumnLabel: (column) => `Změnit šířku ${column}`,
    editCellLabel: (column) => `Upravit ${column}`,
    editCellFromLabel: (column) => `Od ${column}`,
    editCellToLabel: (column) => `Do ${column}`,
    cancelEditLabel: "Zrušit úpravu",
    saveRowLabel: "Uložit řádek",
  },
}

describe("data-table messages", () => {
  it("renders provider text in labels, placeholders and the filter trigger", () => {
    const container = renderTable(
      {
        enableInlineEdit: true,
        editingRowId: "a",
      },
      czech
    )
    const labels = ariaLabels(container)
    expect(labels).toContain("Vybrat Ada")
    expect(labels).toContain("Vybrat vše")
    expect(labels).toContain("Hodnota filtru pro Name")
    expect(labels).toContain("Změnit šířku Name")
    expect(labels).toContain("Zrušit úpravu")
    expect(labels).toContain("Uložit řádek")
    expect(labels).toContain("Upravit Name")
    expect(labels).toContain("Name: Obsahuje")
    expect(placeholders(container)).toContain("Hodnota")
    // Row reordering is off while a row is edited, so the drag handle needs its own render.
    expect(ariaLabels(renderTable({}, czech))).toContain("Přetáhnout Ada")
    expect(
      container.querySelector('[aria-label="Filtr Active"]')?.textContent
    ).toContain("Vše")
  })

  it("lets the table translations prop override the provider for one key", () => {
    const container = renderTable(
      {
        translations: {
          selectRowLabel: (rowLabel) => `Zvolit ${rowLabel}`,
          operatorLabels: { startsWith: "Začíná" },
        },
      },
      czech
    )
    const labels = ariaLabels(container)
    expect(labels).toContain("Zvolit Ada")
    expect(labels).not.toContain("Vybrat Ada")
    // Keys the table does not override still come from the provider.
    expect(labels).toContain("Hodnota filtru pro Name")
    expect(labels).toContain("Name: Obsahuje")
  })

  it("uses English defaults without a provider", () => {
    const container = renderTable({ enableInlineEdit: true, editingRowId: "a" })
    const labels = ariaLabels(container)
    expect(labels).toContain("Select Ada")
    expect(labels).toContain("Filter value for Name")
    expect(labels).toContain("Resize Name")
    expect(labels).toContain("Save row")
    expect(labels).toContain("Cancel edit")
    expect(placeholders(container)).toContain("Value")
    expect(ariaLabels(renderTable())).toContain("Drag to reorder Ada")
  })

  it("names number conditions by their own labels, symbols in English", () => {
    type Priced = { id: string; price: number }
    const priced: ColumnDef<Priced>[] = [
      { accessorKey: "price", header: "Price", meta: { type: "number" } },
    ]
    const table = (translations?: DataTableProps<Priced>["translations"]) => (
      <DataTable<Priced>
        columns={priced}
        data={[{ id: "a", price: 1 }]}
        enableColumnFilters
        getRowId={(row) => row.id}
        translations={translations}
      />
    )
    expect(ariaLabels(render(table()))).toContain(
      "Filter condition for Price: ="
    )
    // A provider's text-condition "Equals" does not rename the number symbol.
    expect(
      ariaLabels(
        render(
          <UiMessagesProvider
            messages={{
              dataTable: {
                operatorLabels: { equals: "Rovná se" },
                numberOperatorLabels: { equals: "rovno" },
              },
            }}
          >
            {table()}
          </UiMessagesProvider>
        )
      )
    ).toContain("Filter condition for Price: rovno")
    // A table's own operatorLabels still name its number conditions, as before.
    expect(
      ariaLabels(render(table({ operatorLabels: { equals: "is" } })))
    ).toContain("Filter condition for Price: is")
  })

  it("names a row without getRowLabel by the catalog's fallback", () => {
    const labels = ariaLabels(
      renderTable(
        { getRowLabel: undefined },
        { dataTable: { rowFallbackLabel: (id) => `řádek ${id}` } }
      )
    )
    expect(labels).toContain("Select řádek a")
    expect(ariaLabels(renderTable({ getRowLabel: undefined }))).toContain(
      "Select row a"
    )
  })

  it("gives a custom filter only the table's own operator labels, as before", () => {
    const seen: unknown[] = []
    const custom: ColumnDef<Row>[] = [
      {
        accessorKey: "name",
        header: "Name",
        meta: {
          renderFilter: (ctx) => {
            seen.push(ctx.operatorLabels)
            return null
          },
        },
      },
    ]
    renderTable({ columns: custom })
    renderTable({
      columns: custom,
      translations: { operatorLabels: { equals: "is" } },
    })
    expect(seen[0]).toBeUndefined()
    expect(seen.at(-1)).toEqual({ equals: "is" })
  })
})
