import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentType, useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { ActionIcon } from "../../src/atoms/action-icon"
import { Badge } from "../../src/atoms/badge"
import { Input } from "../../src/atoms/input"
import { Select } from "../../src/molecules/select"
import type {
  DataTableFilterContext,
  DataTableOption,
} from "../../src/organisms/data-table.fields"
import {
  type CellContext,
  type ColumnDef,
  DataTable,
  type DataTableGetCellSpan,
  type DataTableProps,
} from "../../src/organisms/data-table"

const SALARY_BANDS = [
  { label: "Any band", value: "" },
  { label: "Junior (< 5000)", value: "junior", min: "0", max: "4999" },
  { label: "Senior (5000+)", value: "senior", min: "5000", max: "99999" },
]

/* ── Sample data ─────────────────────────────────────────────────────────── */

type Person = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  status: "active" | "invited" | "suspended"
  age: number
  visits: number
}

const people: Person[] = [
  { id: "1", firstName: "Ada", lastName: "Lovelace", email: "ada@calc.io", role: "Admin", status: "active", age: 36, visits: 812 },
  { id: "2", firstName: "Alan", lastName: "Turing", email: "alan@calc.io", role: "Admin", status: "active", age: 41, visits: 640 },
  { id: "3", firstName: "Grace", lastName: "Hopper", email: "grace@navy.mil", role: "Editor", status: "invited", age: 45, visits: 305 },
  { id: "4", firstName: "Katherine", lastName: "Johnson", email: "kat@nasa.gov", role: "Editor", status: "active", age: 52, visits: 210 },
  { id: "5", firstName: "Margaret", lastName: "Hamilton", email: "maggie@nasa.gov", role: "Viewer", status: "suspended", age: 33, visits: 98 },
  { id: "6", firstName: "Dennis", lastName: "Ritchie", email: "dmr@bell.labs", role: "Admin", status: "active", age: 48, visits: 540 },
  { id: "7", firstName: "Ken", lastName: "Thompson", email: "ken@bell.labs", role: "Editor", status: "invited", age: 47, visits: 430 },
  { id: "8", firstName: "Barbara", lastName: "Liskov", email: "barbara@mit.edu", role: "Viewer", status: "active", age: 39, visits: 156 },
  { id: "9", firstName: "Linus", lastName: "Torvalds", email: "linus@kernel.org", role: "Editor", status: "active", age: 44, visits: 999 },
  { id: "10", firstName: "Radia", lastName: "Perlman", email: "radia@net.io", role: "Viewer", status: "suspended", age: 50, visits: 77 },
]

const bigData: Person[] = Array.from({ length: 500 }, (_, i) => {
  const src = people[i % people.length] as Person
  return { ...src, id: `row-${i}`, firstName: `${src.firstName} ${i}` }
})

const ROLE_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "Editor", value: "Editor" },
  { label: "Viewer", value: "Viewer" },
]

const STATUS_VARIANT: Record<Person["status"], "success" | "info" | "danger"> = {
  active: "success",
  invited: "info",
  suspended: "danger",
}

const StatusBadge = ({ status }: { status: Person["status"] }) => (
  <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
)

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "firstName",
    header: "First name",
    filterFn: "conditional",
    meta: { filterVariant: "text" },
  },
  {
    accessorKey: "lastName",
    header: "Last name",
    filterFn: "conditional",
    meta: { filterVariant: "text" },
  },
  {
    accessorKey: "email",
    header: "Email",
    filterFn: "conditional",
    meta: { filterVariant: "text" },
  },
  {
    accessorKey: "role",
    header: "Role",
    filterFn: "conditional",
    meta: { filterVariant: "select", filterOptions: ROLE_OPTIONS },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue<Person["status"]>()} />,
  },
  {
    accessorKey: "age",
    header: "Age",
    filterFn: "conditional",
    meta: { align: "end", filterVariant: "number" },
  },
  {
    accessorKey: "visits",
    header: "Visits",
    filterFn: "conditional",
    meta: { align: "end", filterVariant: "range" },
  },
]

/* ── Meta ────────────────────────────────────────────────────────────────── */

const meta = {
  title: "Organisms/DataTable",
  component: DataTable as ComponentType<DataTableProps<Person>>,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["line", "outline", "striped"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    stickyHeader: { control: "boolean" },
    striped: { control: "boolean" },
    hideHeader: { control: "boolean" },
  },
} satisfies Meta<DataTableProps<Person>>

export default meta
type Story = StoryObj<DataTableProps<Person>>

const base = { columns, data: people }

/* ── 1. Playground ───────────────────────────────────────────────────────── */

export const Playground: Story = {
  args: {
    ...base,
    enableSorting: true,
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableRowSelection: true,
    enableColumnVisibility: true,
    enablePagination: true,
    caption: "Team members",
    onRowClick: fn(),
    onSortingChange: fn(),
    onRowSelectionChange: fn(),
  },
}

/* ── 2. Sorting ──────────────────────────────────────────────────────────── */

export const Sorting: Story = {
  args: { ...base, enableSorting: true, onSortingChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Age/i }))
    await expect(args.onSortingChange).toHaveBeenCalled()
  },
}

/* ── 3. Column filters with conditions ───────────────────────────────────── */

export const ColumnFiltersWithConditions: Story = {
  args: { ...base, enableColumnFilters: true, onColumnFiltersChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const valueInput = canvas.getByLabelText("Filter value for First name")
    await userEvent.type(valueInput, "Ada")
    await expect(args.onColumnFiltersChange).toHaveBeenCalled()
  },
}

/* ── 4. Header filter template (custom slot) ─────────────────────────────── */

export const HeaderFilterTemplate: Story = {
  args: {
    ...base,
    enableColumnFilters: true,
    onColumnFiltersChange: fn(),
    renderHeaderFilter: (column) =>
      column.id === "email" ? (
        <Input
          aria-label="Custom email filter"
          onChange={(e) =>
            column.setFilterValue({ operator: "contains", value: e.target.value })
          }
          placeholder="Search e-mail…"
          size="sm"
        />
      ) : null,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText("Custom email filter"), "nasa")
    await expect(args.onColumnFiltersChange).toHaveBeenCalled()
  },
}

/* ── 5. Global fulltext search ───────────────────────────────────────────── */

export const GlobalSearch: Story = {
  args: { ...base, enableGlobalFilter: true, onGlobalFilterChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText("Search"), "Hopper")
    await expect(args.onGlobalFilterChange).toHaveBeenCalled()
  },
}

/* ── 5b. Toolbar: search fills the row, custom actions trail it ──────────── */

export const ToolbarActions: Story = {
  args: {
    ...base,
    enableGlobalFilter: true,
    onGlobalFilterChange: fn(),
    toolbarActions: [
      {
        id: "refresh",
        "aria-label": "Refresh",
        icon: "icon-[mdi--refresh]",
        theme: "outlined",
        variant: "secondary",
        onClick: fn(),
      },
      {
        id: "export",
        label: "Export",
        icon: "icon-[mdi--tray-arrow-down]",
        variant: "warning",
        onClick: fn(),
      },
      {
        id: "filters",
        label: "Filtry",
        icon: "token-icon-chevron-down",
        iconPosition: "right",
        variant: "secondary",
        onClick: fn(),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Export" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Refresh" })).toBeVisible()

    // The search is joined to its submit button and stretches to fill the row.
    await expect(canvas.getByLabelText("Submit search")).toBeVisible()

    // Typing reveals the SearchForm clear button, which empties the field.
    const input = canvas.getByLabelText("Search")
    await userEvent.type(input, "Hopper")
    await userEvent.click(canvas.getByLabelText("Clear search"))
    await expect(input).toHaveValue("")
  },
}

/**
 * Toolbar actions on their own, with no global search and no column-visibility
 * cog. The toolbar has to render for these alone — it used to be gated on the
 * other two, so a table configured this way silently dropped its actions.
 */
export const ToolbarActionsOnly: Story = {
  args: {
    ...base,
    toolbarActions: [
      {
        id: "export",
        label: "Export",
        icon: "icon-[mdi--tray-arrow-down]",
        variant: "warning",
        onClick: fn(),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /Export/i })
    ).toBeInTheDocument()
  },
}

/* ── 6. Empty state ──────────────────────────────────────────────────────── */

export const EmptyState: Story = {
  args: {
    ...base,
    data: [],
    translations: {
      emptyTitle: "No team members",
      emptyDescription: "Invite someone to get started.",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The title also appears in the sr-only aria-live status region, so both the
    // visible empty block and the announcement are expected.
    await expect(canvas.getAllByText("No team members")).toHaveLength(2)
    await expect(
      canvas.getByText("Invite someone to get started.")
    ).toBeInTheDocument()
  },
}

/* ── 7. Row actions ──────────────────────────────────────────────────────── */

const onDeleteClick = fn()

export const RowActions: Story = {
  args: {
    ...base,
    renderRowActions: (row) => (
      <ActionIcon
        aria-label={`Delete ${row.original.firstName}`}
        icon="token-icon-trash"
        onClick={() => onDeleteClick(row.original.id)}
        size="sm"
        tone="danger"
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Delete Ada"))
    await expect(onDeleteClick).toHaveBeenCalledWith("1")
  },
}

/* ── 8b. Column widths + text alignment ──────────────────────────────────── */

export const ColumnWidthsAndAlignment: Story = {
  args: {
    ...base,
    tableLayout: "fixed",
    columns: [
      {
        accessorKey: "firstName",
        header: "First name",
        meta: { width: 120 },
      },
      {
        accessorKey: "email",
        header: "Email",
        meta: { width: "var(--dimension-200)", align: "start" },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => (
          <StatusBadge status={info.getValue<Person["status"]>()} />
        ),
        meta: { width: 140, align: "center" },
      },
      {
        accessorKey: "age",
        header: "Age",
        meta: { width: 80, align: "end" },
      },
      {
        accessorKey: "visits",
        header: "Visits",
        meta: { width: "15%", align: "end" },
      },
    ] as ColumnDef<Person>[],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const ageHeader = canvas.getByRole("columnheader", { name: /Age/ })
    await expect(ageHeader).toHaveAttribute("data-align", "end")
    await expect(ageHeader).toHaveStyle({ width: "80px" })

    const statusHeader = canvas.getByRole("columnheader", { name: /Status/ })
    await expect(statusHeader).toHaveAttribute("data-align", "center")
  },
}

/**
 * A numeric `meta.width` must also reach TanStack's size model, otherwise the
 * sticky offset of the next pinned column is computed from the default 150 and
 * the frozen block drifts out of alignment.
 */
export const FrozenColumnWidths: Story = {
  args: {
    ...base,
    tableLayout: "fixed",
    maxHeight: "320px",
    enableColumnPinning: true,
    columnPinning: { end: [], start: ["firstName", "lastName"] },
    // Widths deliberately overflow the container: with `table-layout: fixed` any
    // leftover space is redistributed across columns, which would make the
    // rendered widths drift from the declared ones. Frozen columns only make
    // sense when the table scrolls horizontally anyway.
    columns: [
      { accessorKey: "firstName", header: "First name", meta: { width: 200 } },
      { accessorKey: "lastName", header: "Last name", meta: { width: 240 } },
      { accessorKey: "email", header: "Email", meta: { width: 400 } },
      { accessorKey: "role", header: "Role", meta: { width: 300 } },
      { accessorKey: "age", header: "Age", meta: { width: 200, align: "end" } },
      { accessorKey: "visits", header: "Visits", meta: { width: 300 } },
    ] as ColumnDef<Person>[],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const firstName = canvas.getByRole("columnheader", { name: /First name/ })
    const lastName = canvas.getByRole("columnheader", { name: /Last name/ })
    // The second pinned column must start exactly where the first one ends,
    // which only holds if the declared width also reached TanStack's size model.
    await expect(lastName).toHaveStyle({ left: "200px" })
    await expect(Math.round(firstName.getBoundingClientRect().width)).toBe(200)
  },
}

/* ── 9. Frozen columns (left + right) ────────────────────────────────────── */

export const FrozenColumns: Story = {
  args: {
    ...base,
    enableColumnPinning: true,
    columnPinning: { end: ["visits"], start: ["firstName"] },
    maxHeight: "320px",
  },
}

/* ── 10. Sticky header ───────────────────────────────────────────────────── */

export const StickyHeader: Story = {
  args: { ...base, data: bigData.slice(0, 40), stickyHeader: true, maxHeight: "300px" },
}

/* ── 10a. Grouped headers, sticky, with a filter row ─────────────────────── */

/**
 * Grouped headers stack two label rows above the filter row. Each row needs its
 * own sticky offset — `Table.ColumnHeader` sticks them all at `top: 0` by
 * default, which piles them on top of each other — and the filter row has to
 * clear both. Scroll the body to check nothing overlaps.
 */
export const GroupedStickyHeader: Story = {
  args: {
    data: bigData.slice(0, 40),
    stickyHeader: true,
    maxHeight: "320px",
    enableColumnFilters: true,
    columns: [
      {
        header: "Person",
        columns: [
          { accessorKey: "firstName", header: "First name" },
          { accessorKey: "lastName", header: "Last name" },
        ],
      },
      {
        header: "Activity",
        columns: [
          { accessorKey: "age", header: "Age", meta: { type: "number" } },
          { accessorKey: "visits", header: "Visits", meta: { type: "number" } },
        ],
      },
    ] satisfies ColumnDef<Person>[],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rows = canvasElement.querySelectorAll("thead tr")
    // Two label rows plus the filter row.
    await expect(rows.length).toBe(3)
    await expect(canvas.getByText("Person")).toBeInTheDocument()
    const topOf = (index: number) =>
      Number.parseFloat(
        getComputedStyle(
          rows[index]?.querySelector("th, td") as HTMLElement
        ).top
      )
    // Each row clears the one above it instead of stacking at 0.
    await expect(topOf(0)).toBe(0)
    await expect(topOf(1)).toBeGreaterThan(0)
    await expect(topOf(2)).toBeGreaterThan(topOf(1))
  },
}

/* ── 10b. Hidden header (headerless layout) ──────────────────────────────── */

export const HiddenHeader: Story = {
  args: { ...base, hideHeader: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Headers stay in the accessibility tree so the table keeps its column
    // names; `hideHeader` only hides them visually.
    const headers = canvas.getAllByRole("columnheader")
    await expect(headers.length).toBeGreaterThan(0)
    await expect(headers[0]?.closest("tr")?.parentElement).toHaveClass("sr-only")
    await expect(canvas.getByText("Lovelace")).toBeInTheDocument()
  },
}

/* ── 11. Striped rows ────────────────────────────────────────────────────── */

export const StripedRows: Story = {
  args: { ...base, striped: true },
}

/* ── 11b. Striped + outline (boolean composes with any variant) ──────────── */

export const StripedOutlined: Story = {
  args: { ...base, striped: true, variant: "outline" },
}

/* ── 12. Infinite scroll / virtualization ────────────────────────────────── */

export const InfiniteScrollVirtualized: Story = {
  args: {
    columns,
    data: bigData,
    enableVirtualization: true,
    maxHeight: "400px",
    onReachEnd: fn(),
  },
}

/**
 * Without `maxHeight`, `onReachEnd` watches the *page* scroll instead of an
 * internal container. A second, unrelated effect used to force-measure the
 * (always unbounded, so always "at the bottom") scroll container on every
 * appended page — re-arming the "already reported" latch the instant new rows
 * landed, regardless of where the page had actually scrolled to. On a fast,
 * continuous scroll (no incidental upward wobble to reset it first) the next
 * real reach-end went silently missing. Both existing infinite-scroll stories
 * set `maxHeight`, which is exactly why this went unnoticed.
 */
export const WindowScrollInfiniteLoad: Story = {
  render: () => {
    const [rows, setRows] = useState(bigData.slice(0, 30))
    return (
      <DataTable
        columns={columns}
        data={rows}
        onReachEnd={() => {
          setRows((prev) =>
            prev.length < bigData.length
              ? bigData.slice(0, prev.length + 30)
              : prev
          )
        }}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const scrollTo = async (y: number) => {
      window.scrollTo(0, y)
      window.dispatchEvent(new Event("scroll"))
      await new Promise((r) => setTimeout(r, 150))
    }
    const rowCount = () => canvasElement.querySelectorAll("tbody tr").length

    await new Promise((r) => setTimeout(r, 150))
    const initial = rowCount()
    await scrollTo(999_999)
    const afterFirst = rowCount()
    await expect(afterFirst).toBeGreaterThan(initial)

    // The bug this regresses: the appended page pushes the real bottom
    // further away without firing a scroll event on its own, so
    // `reachedEndRef` only ever finds out once an actual scroll event
    // reports it — scrolling away first, the way a continuous scroll
    // gesture naturally would, then back down to the new bottom.
    await scrollTo(0)
    await scrollTo(999_999)
    const afterSecond = rowCount()
    await expect(afterSecond).toBeGreaterThan(afterFirst)
  },
}

/**
 * `enableVirtualization` without `maxHeight` has no bounded scroll container
 * to measure, so windowing falls back to rendering every row — this asserts
 * that fallback rather than a truncated table. Check the browser console for
 * the accompanying dev warning.
 */
export const VirtualizationWithoutMaxHeight: Story = {
  args: {
    columns,
    data: bigData,
    enableVirtualization: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rows = canvas.getAllByRole("row")
    // Header row(s) plus every one of bigData's rows — not just the first
    // windowed slice.
    await expect(rows.length).toBeGreaterThan(bigData.length)
  },
}

/* ── 13. colSpan / rowSpan ───────────────────────────────────────────────── */

const getCellSpan: DataTableGetCellSpan<Person> = (cell, { rows, rowIndex }) => {
  if (cell.column.id !== "role") {
    return undefined
  }
  const role = cell.row.original.role
  const prev = rows[rowIndex - 1]?.original.role
  if (prev === role) {
    return { hidden: true }
  }
  let rowSpan = 1
  for (let i = rowIndex + 1; i < rows.length; i++) {
    if (rows[i]?.original.role === role) {
      rowSpan++
    } else {
      break
    }
  }
  return { rowSpan }
}

export const ColSpanRowSpan: Story = {
  args: {
    columns,
    // Sorted by role so equal roles are adjacent and merge vertically.
    data: [...people].sort((a, b) => a.role.localeCompare(b.role)),
    getCellSpan,
    showColumnBorder: true,
  },
}

/* ── 14. onRowClick ──────────────────────────────────────────────────────── */

export const RowClick: Story = {
  args: { ...base, onRowClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText("Lovelace"))
    await expect(args.onRowClick).toHaveBeenCalled()
  },
}

/* ── 15. Selectable rows with checkbox ───────────────────────────────────── */

export const RowSelection: Story = {
  args: { ...base, enableRowSelection: true, onRowSelectionChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Select row 1"))
    await expect(args.onRowSelectionChange).toHaveBeenCalled()
  },
}

/* ── 16. Column reorder ──────────────────────────────────────────────────── */

export const ColumnReorder: Story = {
  args: { ...base, enableColumnReorder: true, onColumnReorder: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getAllByLabelText(/^Drag to reorder /).length
    ).toBeGreaterThan(0)
  },
}

/* ── 17. Row reorder ─────────────────────────────────────────────────────── */

export const RowReorder: Story = {
  render: (args) => {
    // DataTable does not own `data`; the consumer applies the reordered array.
    const [rows, setRows] = useState(people)
    return (
      <DataTable
        {...args}
        columns={columns}
        data={rows}
        enableRowReorder
        onRowReorder={(details) => {
          setRows(details.data)
          args.onRowReorder?.(details)
        }}
      />
    )
  },
  args: { ...base, enableRowReorder: true, onRowReorder: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getAllByLabelText(/^Drag to reorder /).length
    ).toBeGreaterThan(0)
  },
}

/* ── 18. Column visibility (show/hide) ───────────────────────────────────── */

export const ColumnVisibility: Story = {
  args: {
    ...base,
    enableColumnVisibility: true,
    onColumnVisibilityChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Icon-only cog trigger, named by its tooltip text.
    const trigger = canvas.getByRole("button", { name: /Column settings/i })
    await userEvent.click(trigger)

    // Toggling a column keeps the list open, so several can be hidden in a row.
    const items = await canvas.findAllByRole("menuitemcheckbox")
    await userEvent.click(items[0] as HTMLElement)
    await expect(
      await canvas.findAllByRole("menuitemcheckbox")
    ).not.toHaveLength(0)
  },
}

/* ── 19. Custom cell content template ────────────────────────────────────── */

export const CustomCellTemplate: Story = {
  args: {
    columns: [
      {
        id: "person",
        header: "Person",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-table-header">
              {row.original.firstName} {row.original.lastName}
            </span>
            <span className="text-fg-secondary text-table-sm">
              {row.original.email}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => (
          <StatusBadge status={info.getValue<Person["status"]>()} />
        ),
      },
      { accessorKey: "role", header: "Role" },
    ],
    data: people,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("ada@calc.io")).toBeInTheDocument()
  },
}

/* ── 20. Tree structure ──────────────────────────────────────────────────── */

type Node = Person & { children?: Node[] }

const p = (i: number) => people[i] as Person

const tree: Node[] = [
  {
    ...p(0),
    children: [
      { ...p(1), id: "1-1" },
      { ...p(2), id: "1-2" },
    ],
  },
  { ...p(3), children: [{ ...p(4), id: "3-1" }] },
]

export const TreeStructure: Story = {
  args: {
    columns: columns as ColumnDef<Person>[],
    data: tree,
    enableExpanding: true,
    getSubRows: (row) => (row as Node).children,
    onExpandedChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByLabelText("Expand row")[0] as HTMLElement)
    await expect(args.onExpandedChange).toHaveBeenCalled()
  },
}

/* ── 20a2. Tree structure with nested rows tinted by depth ───────────────── */

export const TreeStructureTinted: Story = {
  args: {
    columns: columns as ColumnDef<Person>[],
    data: tree,
    enableExpanding: true,
    tintNestedRows: true,
    getSubRows: (row) => (row as Node).children,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByLabelText("Expand row")[0] as HTMLElement)
    const rows = canvasElement.querySelectorAll("tbody tr")
    const childRow = [...rows].find(
      (r) => r.getAttribute("data-depth") === "1"
    )
    await expect(childRow).toBeTruthy()
    await expect(
      childRow && getComputedStyle(childRow).boxShadow
    ).not.toBe("none")
  },
}

/* ── 20b. Master-detail: the expanded row is one free-form box ───────────── */

export const ExpandedRowDetail: Story = {
  args: {
    columns: columns as ColumnDef<Person>[],
    data: tree,
    enableExpanding: true,
    getSubRows: () => undefined,
    // One full-width cell; the content is whatever layout the consumer wants.
    renderExpandedRow: (row) => (
      <div className="grid grid-cols-2 gap-300">
        <div>
          <p className="font-table-header">Contact</p>
          <p className="text-fg-secondary text-table-sm">{row.original.email}</p>
        </div>
        <div>
          <p className="font-table-header">Activity</p>
          <p className="text-fg-secondary text-table-sm">
            {row.original.visits} visits · {row.original.status}
          </p>
        </div>
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByLabelText("Expand row")[0] as HTMLElement)
    await expect(canvas.getByText("Contact")).toBeInTheDocument()
  },
}

/* ── 21. Inline row edit ─────────────────────────────────────────────────── */

/**
 * Escape hatch: a column can render its own always-live editor from
 * `columnDef.cell` and push values through `table.options.meta.updateData`
 * instead of using the edit/save/cancel row flow.
 */
function EditableRoleCell({ getValue, row, column, table }: CellContext<Person, unknown>) {
  const [value, setValue] = useState(String(getValue() ?? ""))
  return (
    <Input
      aria-label={`Edit role for ${row.original.firstName}`}
      onBlur={() => table.options.meta?.updateData?.(row.id, column.id, value)}
      onChange={(e) => setValue(e.target.value)}
      size="sm"
      value={value}
    />
  )
}

const inlineEditColumns: ColumnDef<Person>[] = [
  {
    accessorKey: "firstName",
    header: "First name",
    meta: { type: "string", editable: true, required: true },
  },
  {
    accessorKey: "lastName",
    header: "Last name",
    meta: { type: "string", editable: true, required: true },
  },
  {
    accessorKey: "role",
    header: "Role",
    meta: { type: "enum", editable: true, options: ROLE_OPTIONS },
  },
  {
    accessorKey: "age",
    header: "Age",
    meta: { type: "int", editable: true, align: "end", width: 100 },
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: { type: "string" },
  },
]

export const InlineEdit: Story = {
  args: {
    columns: inlineEditColumns,
    data: people,
    enableInlineEdit: true,
    getRowLabel: (row) => row.original.firstName,
    onEditStart: fn(),
    onEditCommit: fn(),
    onEditCancel: fn(),
  },
  render: (args) => {
    const [rows, setRows] = useState(people)
    return (
      <DataTable
        {...args}
        data={rows}
        onEditCommit={(details) => {
          setRows((current) =>
            current.map((person) =>
              person.id === details.row.id
                ? ({ ...person, ...details.draft } as Person)
                : person
            )
          )
          args.onEditCommit?.(details)
        }}
      />
    )
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    // The table starts in its normal, read-only state — no editors rendered.
    await expect(canvas.queryByLabelText("Edit First name")).toBeNull()

    await userEvent.click(canvas.getByLabelText("Edit Ada"))
    await expect(args.onEditStart).toHaveBeenCalled()

    // Every editable cell of that row swaps to a type-driven editor.
    const firstName = canvas.getByLabelText("Edit First name")
    await expect(canvas.getByLabelText("Edit Age")).toBeInTheDocument()
    // The non-editable column keeps rendering its value.
    await expect(canvas.getByText("ada@calc.io")).toBeInTheDocument()

    await userEvent.clear(firstName)
    await userEvent.type(firstName, "Augusta")
    await userEvent.click(canvas.getByLabelText("Save row"))

    await expect(args.onEditCommit).toHaveBeenCalled()
    await expect(canvas.getByText("Augusta")).toBeInTheDocument()
    await expect(canvas.queryByLabelText("Edit First name")).toBeNull()
  },
}

/* Cancelling restores the original values and leaves edit mode. */
export const InlineEditCancel: Story = {
  args: {
    columns: inlineEditColumns,
    data: people,
    enableInlineEdit: true,
    getRowLabel: (row) => row.original.firstName,
    onEditCancel: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Edit Ada"))

    const firstName = canvas.getByLabelText("Edit First name")
    await userEvent.clear(firstName)
    await userEvent.type(firstName, "Discarded")
    await userEvent.click(canvas.getByLabelText("Cancel edit"))

    await expect(args.onEditCancel).toHaveBeenCalledWith(
      expect.objectContaining({ dirty: true })
    )
    await expect(canvas.getByText("Ada")).toBeInTheDocument()
    await expect(canvas.queryByText("Discarded")).toBeNull()
  },
}

/* Always-live cell editor via `meta.updateData`, without the row edit flow. */
export const InlineEditCustomCell: Story = {
  args: {
    columns: [
      { accessorKey: "firstName", header: "First name" },
      { accessorKey: "lastName", header: "Last name" },
      {
        accessorKey: "role",
        header: "Role",
        meta: { editable: true },
        cell: (ctx) => <EditableRoleCell {...ctx} />,
      },
    ],
    data: people,
    onCellEditCommit: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Edit role for Ada")
    await userEvent.clear(input)
    await userEvent.type(input, "Owner")
    await userEvent.tab()
    await expect(args.onCellEditCommit).toHaveBeenCalled()
  },
}

/* ── 22. Pagination ──────────────────────────────────────────────────────── */

export const Pagination: Story = {
  args: {
    columns,
    data: bigData,
    enablePagination: true,
    pageSizeOptions: [5, 10, 25],
    onPaginationChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/of\s+500/i)).toBeInTheDocument()
    // With 500 rows and a page size of 5, page 2 always exists — hard-assert it
    // so a broken pager fails the story instead of silently skipping.
    // Pager items render as <a> without href, so they expose no `link` role;
    // scope to the pagination widget and match the page number as text.
    const pager = canvasElement.querySelector(
      '[data-scope="pagination"]'
    ) as HTMLElement
    await userEvent.click(within(pager).getByText("2"))
    await expect(args.onPaginationChange).toHaveBeenCalled()
  },
}

/* ── 23. Typed columns: auto-rendered filter controls per column type ────── */

type Employee = {
  id: string
  name: string
  department: string
  skills: string[]
  active: boolean
  salary: number
  startDate: string
  shiftStart: string
}

const DEPARTMENTS: DataTableOption[] = [
  { label: "Engineering", value: "engineering" },
  { label: "Design", value: "design" },
  { label: "Sales", value: "sales" },
]

const SKILLS: DataTableOption[] = [
  { label: "React", value: "react" },
  { label: "Node", value: "node" },
  { label: "Figma", value: "figma" },
  { label: "SQL", value: "sql" },
]

const employees: Employee[] = [
  { id: "e1", name: "Ada Lovelace", department: "engineering", skills: ["react", "node"], active: true, salary: 5200, startDate: "2021-03-01", shiftStart: "08:00" },
  { id: "e2", name: "Grace Hopper", department: "engineering", skills: ["node", "sql"], active: false, salary: 6100, startDate: "2019-09-15", shiftStart: "09:30" },
  { id: "e3", name: "Katherine Johnson", department: "design", skills: ["figma"], active: true, salary: 4800, startDate: "2022-01-10", shiftStart: "07:00" },
  { id: "e4", name: "Margaret Hamilton", department: "sales", skills: ["sql"], active: true, salary: 4300, startDate: "2020-06-20", shiftStart: "10:00" },
  { id: "e5", name: "Barbara Liskov", department: "design", skills: ["figma", "react"], active: false, salary: 5900, startDate: "2018-11-05", shiftStart: "08:30" },
]

const typedColumns: ColumnDef<Employee>[] = [
  {
    accessorKey: "name",
    header: "Name",
    filterFn: "typed",
    meta: { type: "string", editable: true, required: true },
  },
  {
    accessorKey: "department",
    header: "Department",
    filterFn: "typed",
    meta: { type: "enum", options: DEPARTMENTS, editable: true, required: true },
    cell: (info) =>
      DEPARTMENTS.find((d) => d.value === info.getValue<string>())?.label,
  },
  {
    accessorKey: "skills",
    header: "Skills",
    filterFn: "typed",
    meta: { type: "multiEnum", options: SKILLS, editable: true },
    cell: (info) => info.getValue<string[]>().join(", "),
  },
  {
    accessorKey: "active",
    header: "Active",
    filterFn: "typed",
    meta: { type: "boolean", editable: true },
    cell: (info) => (info.getValue<boolean>() ? "Yes" : "No"),
  },
  {
    accessorKey: "salary",
    header: "Salary",
    filterFn: "typed",
    meta: {
      type: "number",
      align: "end",
      editable: true,
      validate: (v) => (Number(v) < 0 ? "Must be positive" : undefined),
    },
  },
  {
    accessorKey: "startDate",
    header: "Start date",
    filterFn: "typed",
    meta: { type: "date", editable: true },
  },
  {
    accessorKey: "shiftStart",
    header: "Shift",
    filterFn: "typed",
    meta: { type: "time", editable: true },
  },
]

/** The Employee stories are typed against their own row shape rather than
 * being cast through `Person`, so a `meta` that does not match the column-meta
 * contract this component introduces fails the build. */
type EmployeeStory = StoryObj<DataTableProps<Employee>>

const typedMeta = {
  columns: typedColumns,
  data: employees,
} satisfies Partial<DataTableProps<Employee>>

export const TypedColumnFilters: EmployeeStory = {
  args: {
    ...typedMeta,
    enableColumnFilters: true,
    enableSorting: true,
    onColumnFiltersChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText("Filter Active")).toBeInTheDocument()
    await expect(canvas.getByLabelText("Filter Shift from")).toBeInTheDocument()
    await userEvent.type(canvas.getByLabelText("Filter Start date"), "2021-01-01")
    await expect(args.onColumnFiltersChange).toHaveBeenCalled()
  },
}

/* ── 23b. Deprecated `filterVariant`, no explicit filterFn ────────────────── */

/**
 * A column declaring only the deprecated `meta.filterVariant` — no
 * `meta.type`, no explicit `filterFn` — is what `applyColumnDefaults` and
 * `resolveColumnType` exist to keep working: the default `filterFn: "typed"`
 * and the number control both have to resolve the same type from
 * `filterVariant` alone, or the control writes an operator object the
 * matcher reads as plain text.
 */
export const DeprecatedFilterVariant: Story = {
  args: {
    columns: [
      { accessorKey: "firstName", header: "First name" },
      {
        accessorKey: "age",
        header: "Age",
        meta: { align: "end", filterVariant: "number" },
      },
    ],
    data: people,
    enableColumnFilters: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const ageInput = canvas.getByLabelText("Filter value for Age")
    await expect(ageInput).toHaveAttribute("type", "number")
    // Default operator is "equals"; no fixture row is age 4. Correct numeric
    // matching shows the empty state. Misread as `meta.type: "string"`, the
    // `{ operator: "equals", value: "4" }` object reaches `matchText`, whose
    // switch has no "equals"-on-an-object case and falls to
    // `String(cell).includes("4")` — five ages (41/44/45/47/48) contain "4"
    // as a substring, so a still-populated table means the bug is back.
    await userEvent.type(ageInput, "4")
    await expect(canvas.getByText("No records")).toBeInTheDocument()
  },
}

/* ── 24. Custom filter template for a non-standard column type ───────────── */

export const CustomFilterTemplate: EmployeeStory = {
  args: {
    ...typedMeta,
    columns: [
      ...typedColumns.slice(0, 2),
      {
        accessorKey: "salary",
        header: "Salary band",
        filterFn: "typed",
        meta: {
          type: "custom",
          renderFilter: ({
            setValue,
            disabled,
            size,
          }: DataTableFilterContext<Employee>) => (
            <Select
              aria-label="Salary band"
              disabled={disabled}
              items={SALARY_BANDS}
              onValueChange={(d) => {
                const band = SALARY_BANDS.find((b) => b.value === d.value[0])
                setValue(
                  band?.value
                    ? { operator: "between", value: band.min, to: band.max }
                    : undefined
                )
              }}
              size={size}
            >
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Any band" />
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {SALARY_BANDS.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      <Select.ItemText />
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select>
          ),
        },
      },
    ] satisfies ColumnDef<Employee>[],
    enableColumnFilters: true,
    onColumnFiltersChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText("Salary band")).toBeInTheDocument()
  },
}

/* ── 25. Inline edit driven by column type + sticky actions ──────────────── */

export const InlineEditByColumnType: EmployeeStory = {
  args: {
    ...typedMeta,
    enableInlineEdit: true,
    stickyActions: true,
    onEditStart: fn(),
    onEditCommit: fn(),
    onEditCancel: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Edit row 0"))
    await expect(args.onEditStart).toHaveBeenCalled()
    // Type-driven editors replace the cells of the edited row only.
    await expect(canvas.getByLabelText("Edit Name")).toBeInTheDocument()
    await expect(canvas.getByLabelText("Edit Start date")).toBeInTheDocument()
    await userEvent.click(canvas.getByLabelText("Save row"))
    await expect(args.onEditCommit).toHaveBeenCalled()
  },
}

/* ── 26. Edit mode locks filtering, selection and sorting ────────────────── */

export const EditModeLocksInteractions: EmployeeStory = {
  args: {
    ...typedMeta,
    enableInlineEdit: true,
    enableColumnFilters: true,
    enableRowSelection: true,
    enableSorting: true,
    onInteractionBlocked: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Edit row 0"))
    // Filter inputs, selection checkboxes and sort buttons are disabled.
    await expect(canvas.getByLabelText("Select row 0")).toBeDisabled()
    await expect(canvas.getByRole("button", { name: /Salary/i })).toBeDisabled()
    // Cancelling releases the lock again.
    await userEvent.click(canvas.getByLabelText("Cancel edit"))
    await expect(canvas.getByLabelText("Select row 0")).not.toBeDisabled()
    await expect(args.onInteractionBlocked).not.toHaveBeenCalled()
  },
}

/* ── 27. Size propagates to every nested control ─────────────────────────── */

export const SizeSynchronised: EmployeeStory = {
  args: {
    ...typedMeta,
    size: "lg",
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableInlineEdit: true,
    enablePagination: true,
    pageSizeOptions: [2, 5],
  },
}

/* ── 28. Single-row selection ────────────────────────────────────────────── */

export const SingleRowSelection: Story = {
  args: {
    ...base,
    enableRowSelection: true,
    selectionMode: "single",
    onRowSelectionChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Select row 0"))
    await expect(canvas.getByLabelText("Select row 0")).toBeChecked()
    // Selecting another row replaces the first instead of adding to it.
    await userEvent.click(canvas.getByLabelText("Select row 1"))
    await expect(canvas.getByLabelText("Select row 1")).toBeChecked()
    await expect(canvas.getByLabelText("Select row 0")).not.toBeChecked()
  },
}

/* ── 29. Capped selection (max 2 rows) ───────────────────────────────────── */

export const MaxTwoRowsSelectable: Story = {
  args: {
    ...base,
    enableRowSelection: true,
    maxSelectedRows: 2,
    onSelectionLimitReached: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Select row 0"))
    await userEvent.click(canvas.getByLabelText("Select row 1"))
    await expect(args.onSelectionLimitReached).toHaveBeenCalled()
    // Unselected rows lock once the cap is hit…
    await expect(canvas.getByLabelText("Select row 2")).toBeDisabled()
    // …while the selected ones can still be released.
    await expect(canvas.getByLabelText("Select row 0")).not.toBeDisabled()
    await userEvent.click(canvas.getByLabelText("Select row 0"))
    await expect(canvas.getByLabelText("Select row 2")).not.toBeDisabled()
  },
}

/* ── 30. Custom selectability rule ───────────────────────────────────────── */

export const ConditionalRowSelection: Story = {
  args: {
    ...base,
    enableRowSelection: true,
    canSelectRow: (row) => row.original.status === "active",
    onRowSelectionChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Row 0 is active, row 2 is invited.
    await expect(canvas.getByLabelText("Select row 0")).not.toBeDisabled()
    await expect(canvas.getByLabelText("Select row 2")).toBeDisabled()
  },
}

/* ── 31. Per-row action permissions ──────────────────────────────────────── */

const onArchive = fn()
const onDelete = fn()

export const PerRowActionPermissions: Story = {
  args: {
    ...base,
    enableInlineEdit: true,
    // Suspended records are read-only for the current user.
    canEditRow: (row) => row.original.status !== "suspended",
    rowActions: [
      {
        id: "archive",
        label: "Archive",
        icon: "icon-[mdi--archive]",
        // Already-suspended rows cannot be archived again.
        disabled: (row) => row.original.status === "suspended",
        onAction: (row) => onArchive(row.original.id),
      },
      {
        id: "delete",
        label: "Delete",
        icon: "token-icon-trash",
        tone: "danger",
        // Admins may not be deleted at all — hide rather than disable.
        hidden: (row) => row.original.role === "Admin",
        onAction: (row) => onDelete(row.original.id),
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rows = canvas.getAllByRole("row")
    // Row 1 (Ada, Admin, active): editable, archivable, no delete action.
    const adaRow = within(rows[1] as HTMLElement)
    await expect(adaRow.getByLabelText("Edit row 0")).not.toBeDisabled()
    await expect(adaRow.getByLabelText("Archive")).not.toBeDisabled()
    await expect(adaRow.queryByLabelText("Delete")).not.toBeInTheDocument()
    // Row 5 (Margaret, Viewer, suspended): edit and archive both blocked.
    const suspendedRow = within(rows[5] as HTMLElement)
    await expect(suspendedRow.getByLabelText("Edit row 4")).toBeDisabled()
    await expect(suspendedRow.getByLabelText("Archive")).toBeDisabled()
    await expect(suspendedRow.getByLabelText("Delete")).toBeInTheDocument()
  },
}

/* ── 32. Loading skeletons ───────────────────────────────────────────────── */

export const LoadingSkeletons: Story = {
  args: { ...base, loading: true, loadingRowCount: 6, enableSorting: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Header still renders so the layout does not jump once data arrives.
    await expect(canvas.getByText("First name")).toBeInTheDocument()
    await expect(canvas.queryByText("Lovelace")).not.toBeInTheDocument()
  },
}

/* ── 33. Loading more (infinite scroll footer) ───────────────────────────── */

export const LoadingMore: Story = {
  args: {
    columns,
    data: people,
    loadingMore: true,
    maxHeight: "320px",
    onReachEnd: fn(),
  },
}

/* ── 34. Drag affordances ────────────────────────────────────────────────── */

export const DragAffordances: Story = {
  args: {
    ...base,
    enableColumnReorder: true,
    enableRowReorder: true,
    onColumnReorder: fn(),
    onRowReorder: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Handles name what they move, so 50 rows aren't 50 identical buttons.
    await expect(
      canvas.getByLabelText("Drag to reorder First name")
    ).toBeInTheDocument()
    await expect(
      canvas.getByLabelText("Drag to reorder row 0")
    ).toBeInTheDocument()
  },
}

/* ── 35. Accessibility semantics ─────────────────────────────────────────── */

export const AccessibleSemantics: Story = {
  args: {
    ...base,
    enableSorting: true,
    enableRowSelection: true,
    enableExpanding: true,
    getSubRows: () => undefined,
    getRowLabel: (row) => `${row.original.firstName} ${row.original.lastName}`,
    onRowClick: fn(),
    onSortingChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Sortable headers expose their sort state to assistive tech.
    const ageHeader = canvas.getByRole("columnheader", { name: /Age/i })
    await expect(ageHeader).toHaveAttribute("aria-sort", "none")
    await userEvent.click(canvas.getByRole("button", { name: /Age/i }))
    // TanStack sorts numeric columns descending on the first click.
    await expect(ageHeader).toHaveAttribute("aria-sort", "descending")
    // Selection checkboxes are labelled by row content, not the opaque row id.
    await expect(canvas.getByLabelText("Select Ada Lovelace")).toBeInTheDocument()
    // Clickable rows are reachable and activatable from the keyboard.
    const row = canvas.getAllByRole("row")[1] as HTMLElement
    await expect(row).toHaveAttribute("tabindex", "0")
    row.focus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onRowClick).toHaveBeenCalled()
  },
}
