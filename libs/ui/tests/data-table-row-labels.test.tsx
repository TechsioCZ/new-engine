import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  type ColumnDef,
  DataTable,
  type DataTableProps,
} from "../src/organisms/data-table"
import { FieldSelect } from "../src/organisms/data-table.fields"

const FILTER_TRIGGER_RE = /<button[^>]*aria-label="Filter Role"[^>]*>/

type RecordRow = { id: string; name: string }

const data: RecordRow[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Alan" },
]

const columns: ColumnDef<RecordRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { editable: true },
  },
]

const renderTable = (overrides: Partial<DataTableProps<RecordRow>> = {}) =>
  renderToStaticMarkup(
    h(DataTable<RecordRow>, {
      data,
      columns,
      getRowId: (row) => row.id,
      getRowLabel: (row) => row.original.name,
      ...overrides,
    })
  )

const labelsOf = (html: string) =>
  [...html.matchAll(/aria-label="([^"]*)"/g)].map((match) => match[1])

describe("row-level accessible names", () => {
  it("keeps the default selection checkbox name", () => {
    const html = renderTable({ enableRowSelection: true })
    expect(labelsOf(html)).toContain("Select Ada")
    expect(labelsOf(html)).toContain("Select Alan")
  })

  it("routes the selection checkbox name through translations.selectRowLabel", () => {
    const html = renderTable({
      enableRowSelection: true,
      translations: {
        selectRowLabel: (rowLabel) => `Choose ${rowLabel} for export`,
      },
    })
    expect(labelsOf(html)).toContain("Choose Ada for export")
    expect(labelsOf(html)).toContain("Choose Alan for export")
    expect(labelsOf(html)).not.toContain("Select Ada")
  })

  it("falls back to the row id when no getRowLabel is given", () => {
    const html = renderTable({
      enableRowSelection: true,
      getRowLabel: undefined,
      translations: { selectRowLabel: (rowLabel) => `Pick ${rowLabel}` },
    })
    expect(labelsOf(html)).toContain("Pick row a")
  })

  it("keeps the default edit button name", () => {
    const html = renderTable({ enableInlineEdit: true })
    expect(labelsOf(html)).toContain("Edit Ada")
  })

  it("routes the edit button name through translations.editRowLabel", () => {
    const html = renderTable({
      enableInlineEdit: true,
      translations: { editRowLabel: (rowLabel) => `Change ${rowLabel}` },
    })
    expect(labelsOf(html)).toContain("Change Ada")
    expect(labelsOf(html)).not.toContain("Edit Ada")
  })
})

describe("FieldSelect listbox name", () => {
  const items = [
    { label: "Administrator", value: "admin" },
    { label: "Editor", value: "editor" },
  ]

  it("names the listbox with the same label as the trigger", () => {
    const html = renderToStaticMarkup(
      h(FieldSelect, {
        items,
        value: "admin",
        ariaLabel: "Filter Role",
        onChange: () => undefined,
      })
    )
    const names = labelsOf(html).filter((name) => name === "Filter Role")
    expect(names).toHaveLength(2)
  })

  it("keeps the trigger named by aria-label alone", () => {
    const html = renderToStaticMarkup(
      h(FieldSelect, {
        items,
        value: "admin",
        ariaLabel: "Filter Role",
        onChange: () => undefined,
      })
    )
    const trigger = html.match(FILTER_TRIGGER_RE)?.[0]
    expect(trigger).toBeDefined()
    expect(trigger).not.toContain("aria-labelledby")
  })

  it("does not add a listbox name when no label is given", () => {
    const html = renderToStaticMarkup(
      h(FieldSelect, {
        items,
        value: "admin",
        onChange: () => undefined,
      })
    )
    expect(labelsOf(html)).toEqual([])
  })
})
