import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentType, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { ActionIcon } from "../../src/atoms/action-icon"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { Textarea } from "../../src/atoms/textarea"
import { Dialog } from "../../src/molecules/dialog"
import { Select } from "../../src/molecules/select"
import {
  type CellContext,
  type ColumnDef,
  DataTable,
  type DataTableFilterContext,
  type DataTableGetCellSpan,
  type DataTableOption,
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
    // No `filterFn: "conditional"`: a select has no operators to pick, so the
    // default `"typed"` filter (which matches the enum's `{ values }` shape)
    // is the right pairing and the clearer example.
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
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode", "columns", "rowActions"] },
    docs: { description: { component: "DataTable presents structured records with sorting, filtering, selection and optional inline editing. Use it for operational lists with many rows; use Table for small static comparisons and TreeView for hierarchical navigation. Destructive application actions require confirmation or a reversible undo flow." } }, layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    columns: { control: false },
    rowActions: { control: false },
    variant: { control: "select", options: ["line", "outline", "striped"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    stickyHeader: { control: "boolean" },
    striped: { control: "boolean" },
    hideHeader: { control: "boolean" },
  },
} satisfies Meta<DataTableProps<Person>>

export default meta
type Story = StoryObj<DataTableProps<Person>>

const base = { columns, data: people, getRowId: (person: Person) => String(person.id) }

/* ── 1. Playground ───────────────────────────────────────────────────────── */

export const Playground: Story = {
  parameters: { docs: { description: { story: "Use the controls to explore the component in a realistic layout without leaving the preview." } } },
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

export const Sizes: Story = {
  args: { ...base, enablePagination: false },
  parameters: { controls: { disable: true }, docs: { description: { story: "Compare Small (sm), Medium (md) and Large (lg) with identical team records and controls." } } },
  render: (args) => <div className="flex flex-col gap-400">
    {(["sm", "md", "lg"] as const).map((size) => <section key={size}>
      <h2>{{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}</h2>
      <DataTable {...args} size={size} data={people.slice(0, 3)} columns={columns} caption="Team members" />
    </section>)}
  </div>,
}

/* ── 2. Sorting ──────────────────────────────────────────────────────────── */

export const Sorting: Story = {
  parameters: { docs: { description: { story: "Activate a column heading with a pointer or keyboard to sort the team list." } } },
  args: { ...base, enableSorting: true, onSortingChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Age/i }))
    await expect(args.onSortingChange).toHaveBeenCalled()
  },
}

/* ── 3. Column filters with conditions ───────────────────────────────────── */

export const ColumnFiltersWithConditions: Story = {
  parameters: { docs: { description: { story: "Combine a column value with a condition such as contains to narrow records without changing the underlying data." } } },
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
  parameters: { docs: { description: { story: "A custom email filter keeps domain-specific input in the appropriate column rather than adding a second search surface." } } },
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
  parameters: { docs: { description: { story: "Search across the visible record set when the user knows a value but not which column contains it." } } },
  args: { ...base, enableGlobalFilter: true, onGlobalFilterChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText("Search"), "Hopper")
    await expect(args.onGlobalFilterChange).toHaveBeenCalled()
  },
}

/* ── 5b. Toolbar: search fills the row, custom actions trail it ──────────── */

export const ToolbarActions: Story = {
  parameters: { docs: { description: { story: "Keep the main create action in the toolbar while filters remain associated with the records they affect." } } },
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
  parameters: { docs: { description: { story: "A toolbar can hold local actions without showing an unused search field." } } },
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
  parameters: { docs: { description: { story: "An empty table explains why no records appear and offers a clear next step instead of a blank grid." } } },
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
  parameters: { docs: { description: { story: "Use named per-record actions so their purpose remains clear without relying on an icon alone." } } },
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
  parameters: { docs: { description: { story: "Adjust column widths and align numeric values to keep a mixed record set easy to scan." } } },
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
  parameters: { docs: { description: { story: "Explicit widths keep pinned identity columns aligned with the scrollable record data." } } },
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
  parameters: { docs: { description: { story: "Pin identity and action columns to opposite edges while the remaining fields scroll horizontally." } } },
  args: {
    ...base,
    enableColumnPinning: true,
    columnPinning: { end: ["visits"], start: ["firstName"] },
    maxHeight: "320px",
  },
}

/* ── 10. Sticky header ───────────────────────────────────────────────────── */

export const StickyHeader: Story = {
  parameters: { docs: { description: { story: "A sticky header preserves column context while records scroll within a bounded region." } } },
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
  parameters: { docs: { description: { story: "Grouped column headings stack without covering each other while the records scroll." } } },
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
  parameters: { docs: { description: { story: "Hide visible headings only when the table context still supplies understandable column names." } } },
  args: { ...base, hideHeader: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Headers stay in the accessibility tree so the table keeps its column
    // names; `hideHeader` only hides them visually.
    const headers = canvas.getAllByRole("columnheader")
    await expect(headers.length).toBeGreaterThan(0)
    // `hideHeader` puts `sr-only` on the header `<tr>` itself (not on
    // `<thead>`, which must keep the filter row visible), so `closest("tr")`
    // is already the element carrying it.
    await expect(headers[0]?.closest("tr")).toHaveClass("sr-only")
    await expect(canvas.getByText("Lovelace")).toBeInTheDocument()
  },
}

/* ── 11. Striped rows ────────────────────────────────────────────────────── */

export const StripedRows: Story = {
  parameters: { docs: { description: { story: "Alternating row surfaces help readers track dense records across many columns." } } },
  args: { ...base, striped: true },
}

/* ── 11b. Striped + outline (boolean composes with any variant) ──────────── */

export const StripedOutlined: Story = {
  parameters: { docs: { description: { story: "Combine a restrained outer boundary with alternating rows for a dense standalone record panel." } } },
  args: { ...base, striped: true, variant: "outline" },
}

/* ── 12. Infinite scroll / virtualization ────────────────────────────────── */

export const InfiniteScrollVirtualized: Story = {
  parameters: { docs: { description: { story: "A bounded virtualized list loads more records as you approach the end without mounting every row." } } },
  args: {
    columns,
    data: bigData,
    enableVirtualization: true,
    caption: "Virtualized team members",
    maxHeight: "400px",
    onReachEnd: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Virtualized team members" })
    await expect(region).toHaveAttribute("tabindex", "0")
    await expect(canvas.getByRole("table")).toHaveAttribute("aria-rowcount", "501")
    await expect(canvas.getAllByRole("row").length).toBeLessThan(100)
    region.scrollTop = 3000
    region.dispatchEvent(new Event("scroll"))
    await waitFor(() => {
      const row = canvasElement.querySelector("tbody tr[aria-rowindex]")
      expect(Number(row?.getAttribute("aria-rowindex"))).toBeGreaterThan(2)
    })
    for (const spacer of canvasElement.querySelectorAll("tbody tr:not([aria-rowindex])")) {
      await expect(spacer).toHaveAttribute("aria-hidden", "true")
    }
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
  parameters: {
    controls: { disable: true }, docs: { description: { story: "Page-level loading uses the window scroll position instead of an unnecessary nested scrollbar." } } },
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
  parameters: { docs: { description: { story: "Without a bounded scroll region the table falls back to ordinary rows rather than silently losing records." } } },
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
  parameters: { docs: { description: { story: "Merged cells communicate genuinely shared data while keeping the record structure readable." } } },
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
  parameters: { docs: { description: { story: "Activate a record using the pointer, Enter or Space while preserving independent controls inside each row." } } },
  args: { ...base, onRowClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText("Lovelace"))
    await expect(args.onRowClick).toHaveBeenCalled()
  },
}

/* ── 15. Selectable rows with checkbox ───────────────────────────────────── */

export const RowSelection: Story = {
  parameters: { docs: { description: { story: "Selection checkboxes identify individual records and expose the current selected state." } } },
  args: { ...base, enableRowSelection: true, onRowSelectionChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Select row 1"))
    await expect(args.onRowSelectionChange).toHaveBeenCalled()
  },
}

/* ── 16. Column reorder ──────────────────────────────────────────────────── */

export const ColumnReorder: Story = {
  parameters: { docs: { description: { story: "Drag a column grip to rearrange fields without confusing sorting with reordering." } } },
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
  parameters: { docs: { description: { story: "Reorder records with explicit drag handles while keeping unrelated row actions independent." } } },
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

export const KeyboardReorder: Story = {
  parameters: { docs: { description: { story: "Keyboard reordering announces movement so drag handles remain usable without a pointer." } } },
  tags: ["dnd-regression"],
  args: {
    ...base,
    enableColumnReorder: true,
    enableRowReorder: true,
    enableRowSelection: true,
    enableColumnPinning: true,
    columnPinning: { end: [], start: ["email"] },
    columnVisibility: { lastName: false },
    // Omitted columns must remain in the callback's complete public order.
    columnOrder: ["firstName", "role", "status", "age", "visits"],
    getRowId: (person) => person.id,
    getRowLabel: (row) => `${row.original.firstName} ${row.original.lastName}`,
    onColumnReorder: fn(),
    onRowReorder: fn(),
    onRowClick: fn(),
  },
  render: (args) => {
    const [rows, setRows] = useState(() =>
      people.map((person, index) => ({
        ...person,
        // Row ids deliberately match column ids in the shared provider.
        id: index === 0 ? "firstName" : index === 1 ? "role" : person.id,
      }))
    )
    const [order, setOrder] = useState(args.columnOrder)
    return (
      <DataTable
        {...args}
        columnOrder={order}
        data={rows}
        onColumnOrderChange={setOrder}
        onRowReorder={(details) => {
          setRows(details.data)
          args.onRowReorder?.(details)
        }}
      />
    )
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("columnheader", { name: "Reorder rows" })).toBeVisible()
    await expect(canvas.queryByLabelText("Drag to reorder Email")).toBeNull()
    await expect(canvas.queryByLabelText("Drag to reorder Last name")).toBeNull()

    const columnHandle = canvas.getByLabelText("Drag to reorder First name")
    columnHandle.focus()
    await userEvent.keyboard("[Space]")
    await waitFor(() => expect(columnHandle).toHaveAttribute("aria-pressed", "true"))
    await userEvent.keyboard("[ArrowRight]")
    await waitFor(() =>
      expect(canvas.getByRole("columnheader", { name: /Role/ })).toHaveClass("border-e-2")
    )
    await userEvent.keyboard("[Space]")
    await waitFor(() =>
      expect(args.onColumnReorder).toHaveBeenLastCalledWith({
        from: 0,
        to: 1,
        columnId: "firstName",
        order: ["role", "firstName", "status", "age", "visits", "lastName", "email"],
      })
    )
    await expect(args.onRowReorder).not.toHaveBeenCalled()
    await waitFor(() => expect(columnHandle).toHaveFocus())
    await waitFor(async () => {
      const rect = columnHandle.getBoundingClientRect()
      await expect(
        columnHandle.contains(
          canvasElement.ownerDocument.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          )
        )
      ).toBe(true)
    })

    const rowHandle = canvas.getByLabelText("Drag to reorder Ada Lovelace")
    rowHandle.focus()
    await userEvent.keyboard("[Space]")
    await waitFor(() => expect(rowHandle).toHaveAttribute("aria-pressed", "true"))
    await userEvent.keyboard("[ArrowDown]")
    await waitFor(() =>
      expect(canvas.getByLabelText("Drag to reorder Alan Turing").closest("tr")).toHaveClass("border-b-2")
    )
    await userEvent.keyboard("[Space]")
    await waitFor(() =>
      expect(args.onRowReorder).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: 0, to: 1, rowId: "firstName" })
      )
    )
    await expect(args.onColumnReorder).toHaveBeenCalledTimes(1)
    await expect(args.onRowClick).not.toHaveBeenCalled()
    await waitFor(() => expect(rowHandle).toHaveFocus())

    const cancelHandle = canvas.getByLabelText("Drag to reorder Ada Lovelace")
    cancelHandle.focus()
    await userEvent.keyboard("[Space]")
    await waitFor(() => expect(cancelHandle).toHaveAttribute("aria-pressed", "true"))
    await userEvent.keyboard("[ArrowDown]")
    await waitFor(() =>
      expect(canvas.getByLabelText("Drag to reorder Grace Hopper").closest("tr")).toHaveClass("border-b-2")
    )
    await userEvent.keyboard("[Escape]")
    await waitFor(() => expect(cancelHandle).toHaveAttribute("aria-pressed", "false"))
    await expect(args.onRowReorder).toHaveBeenCalledTimes(1)
  },
}

export const PaginatedRowReorder: Story = {
  parameters: { docs: { description: { story: "Reordering a page updates the correct records rather than applying page-local indices to the full data set." } } },
  tags: ["dnd-regression"],
  args: {
    ...base,
    enableRowReorder: true,
    enablePagination: true,
    pageSizeOptions: [3, 10, 25],
    pagination: { pageIndex: 1, pageSize: 3 },
    getRowId: (person) => person.id,
    onRowReorder: fn(),
  },
  render: (args) => {
    const [rows, setRows] = useState(people)
    return (
      <DataTable
        {...args}
        data={rows}
        onRowReorder={(details) => {
          setRows(details.data)
          args.onRowReorder?.(details)
        }}
      />
    )
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const handle = canvas.getByLabelText("Drag to reorder row 4")
    await expect(canvas.getByRole("columnheader", { name: "Reorder rows" })).toBeVisible()
    await waitFor(() => {
      const renderedRows = canvas.getAllByRole("row").filter(
        (row) => row.parentElement?.tagName === "TBODY"
      )
      expect(renderedRows.map((row) =>
        row.querySelector<HTMLButtonElement>('button[aria-label^="Drag to reorder row "]')?.getAttribute("aria-label")
      )).toEqual([
        "Drag to reorder row 4",
        "Drag to reorder row 5",
        "Drag to reorder row 6",
      ])
      expect(handle).toHaveAttribute("aria-pressed", "false")
      expect(args.onRowReorder).not.toHaveBeenCalled()
    })
  },
}

/* ── 18. Column visibility (show/hide) ───────────────────────────────────── */

export const ColumnVisibility: Story = {
  parameters: { docs: { description: { story: "Let readers hide optional fields without losing the identity column needed to recognize a record." } } },
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
    const body = within(canvasElement.ownerDocument.body)
    const menu = within(await body.findByRole("menu"))
    const firstName = await menu.findByRole("menuitemcheckbox", { name: "First name" })
    await userEvent.click(firstName)
    await expect(firstName).toHaveAttribute("aria-checked", "false")
    await expect(
      await menu.findAllByRole("menuitemcheckbox")
    ).not.toHaveLength(0)
    // Zag's interaction modality is page-global; re-hover so the leave counts as pointer input.
    await userEvent.hover(firstName)
    await userEvent.unhover(firstName)
    await waitFor(() => expect(firstName).not.toHaveAttribute("data-highlighted"))
  },
}

/* ── 19. Custom cell content template ────────────────────────────────────── */

export const CustomCellTemplate: Story = {
  parameters: { docs: { description: { story: "A custom cell presents structured record content while the table still owns sorting and alignment." } } },
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
  parameters: { docs: { description: { story: "Expandable rows reveal child records in place when hierarchy matters more than a flat list." } } },
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
  parameters: { docs: { description: { story: "A subtle depth tint reinforces nested rows without replacing their indentation and disclosure cues." } } },
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
  parameters: { docs: { description: { story: "Expand a record to inspect supporting details without navigating away from the list." } } },
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
  parameters: { docs: { description: { story: "Edit a record in place, then cancel or save the draft through explicit row actions." } } },
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
        onEditCommit={async (details) => {
          await args.onEditCommit?.(details)
          setRows((current) =>
            current.map((person) =>
              person.id === details.row.id
                ? ({ ...person, ...details.draft } as Person)
                : person
            )
          )
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
    await userEvent.click(canvas.getByLabelText("Save row"))
    const error = canvas.getByRole("alert")
    await expect(error).toHaveTextContent("Enter a value before saving this row.")
    await expect(firstName).toHaveAttribute("aria-invalid", "true")
    await expect(firstName).toHaveAttribute("aria-errormessage", error.id)
    await expect(firstName).toHaveAccessibleDescription(error.textContent ?? "")
    await expect(error.querySelector('[aria-hidden="true"]')).not.toBeNull()
    await userEvent.type(firstName, "Augusta")
    await userEvent.click(canvas.getByLabelText("Save row"))

    await expect(args.onEditCommit).toHaveBeenCalled()
    await expect(canvas.getByText("Augusta")).toBeInTheDocument()
    await expect(canvas.queryByLabelText("Edit First name")).toBeNull()
  },
}

/* Cancelling restores the original values and leaves edit mode. */
export const InlineEditCancel: Story = {
  parameters: { docs: { description: { story: "Cancel an inline draft without changing the original record." } } },
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
  parameters: { docs: { description: { story: "A custom editor uses the same draft and commit contract as the built-in field editors." } } },
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
  parameters: { docs: { description: { story: "Page controls preserve a manageable record set and announce the current range." } } },
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
      validate: (v) => (Number(v) < 0 ? "Enter a salary of zero or more." : undefined),
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
  parameters: { docs: { description: { story: "Column-type-specific filters match the input to the value being queried." } } },
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
  parameters: { docs: { description: { story: "Legacy filter configuration remains supported while new examples use the current column metadata." } } },
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
    await expect(await canvas.findByText("No records", { selector: "p" })).toBeVisible()
  },
}

/* ── 24. Custom filter template for a non-standard column type ───────────── */

export const CustomFilterTemplate: EmployeeStory = {
  parameters: { docs: { description: { story: "A custom filter integrates domain-specific options without replacing the table layout." } } },
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
                {/* The name belongs on the trigger: `Select`'s root
                    destructures a closed prop list with no rest spread, so an
                    `aria-label` there never reaches the DOM. */}
                <Select.Trigger aria-label="Salary band">
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
  parameters: { docs: { description: { story: "Text, number and choice editors share the same row draft and save behavior." } } },
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
  parameters: { docs: { description: { story: "Lock conflicting record interactions while a row draft is active to avoid accidental changes." } } },
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
    await expect(canvas.getByRole("button", { name: "Salary" })).toBeDisabled()
    // Cancelling releases the lock again.
    await userEvent.click(canvas.getByLabelText("Cancel edit"))
    await expect(canvas.getByLabelText("Select row 0")).not.toBeDisabled()
    await expect(args.onInteractionBlocked).not.toHaveBeenCalled()
    const editTrigger = canvas.getByLabelText("Edit row 0")
    await waitFor(() => expect(editTrigger).toHaveFocus())
    await userEvent.unhover(editTrigger)
    editTrigger.blur()
    await expect(editTrigger).not.toHaveFocus()
  },
}

/* ── 27. Size propagates to every nested control ─────────────────────────── */

export const LargeFieldAlignment: EmployeeStory = {
  parameters: { docs: { description: { story: "Large table cells, filters and inline editors stay aligned because their size is inherited consistently." } } },
  args: {
    ...typedMeta,
    size: "lg",
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableInlineEdit: true,
    enablePagination: true,
    pageSizeOptions: [2, 5],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByLabelText("Edit row 0")[0] as HTMLElement)
    const salary = canvas.getByRole("spinbutton", { name: "Edit Salary" })
    await expect(salary).toHaveValue("5200")
    const style = getComputedStyle(salary)
    const valueWidth = salary.getBoundingClientRect().width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
    await expect(valueWidth).toBeGreaterThan(80)
    await expect(canvasElement.querySelector(".switch-size-lg")).not.toBeNull()
    salary.scrollIntoView({ block: "nearest", inline: "center" })
    salary.focus()
    const rect = salary.getBoundingClientRect()
    const surface = canvasElement.ownerDocument.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await expect(surface).toBe(salary)
  },
}

/* ── 28. Single-row selection ────────────────────────────────────────────── */

export const SingleRowSelection: Story = {
  parameters: { docs: { description: { story: "Single-selection mode replaces the previous selection instead of accumulating records." } } },
  args: {
    ...base,
    enableRowSelection: true,
    selectionMode: "single",
    onRowSelectionChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("columnheader", { name: "Select rows" })).toBeVisible()
    await userEvent.click(canvas.getByLabelText("Select row 1"))
    await expect(canvas.getByLabelText("Select row 1")).toBeChecked()
    // Selecting another row replaces the first instead of adding to it.
    await userEvent.click(canvas.getByLabelText("Select row 2"))
    await expect(canvas.getByLabelText("Select row 2")).toBeChecked()
    await expect(canvas.getByLabelText("Select row 1")).not.toBeChecked()
  },
}

/* ── 29. Capped selection (max 2 rows) ───────────────────────────────────── */

export const MaxTwoRowsSelectable: Story = {
  parameters: { docs: { description: { story: "A selection limit gives feedback before an action could exceed the allowed record count." } } },
  args: {
    ...base,
    enableRowSelection: true,
    maxSelectedRows: 2,
    onSelectionLimitReached: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("columnheader", { name: "Select rows" })).toBeVisible()
    await userEvent.click(canvas.getByLabelText("Select row 1"))
    await userEvent.click(canvas.getByLabelText("Select row 2"))
    await expect(args.onSelectionLimitReached).toHaveBeenCalled()
    // Unselected rows lock once the cap is hit…
    await expect(canvas.getByLabelText("Select row 3")).toBeDisabled()
    // …while the selected ones can still be released.
    await expect(canvas.getByLabelText("Select row 1")).not.toBeDisabled()
    await userEvent.click(canvas.getByLabelText("Select row 1"))
    await expect(canvas.getByLabelText("Select row 3")).not.toBeDisabled()
  },
}

/* ── 30. Custom selectability rule ───────────────────────────────────────── */

export const ConditionalRowSelection: Story = {
  parameters: { docs: { description: { story: "Record-specific eligibility prevents selection when an action is not available for that record." } } },
  args: {
    ...base,
    enableRowSelection: true,
    canSelectRow: (row) => row.original.status === "active",
    onRowSelectionChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Row 0 is active, row 2 is invited.
    await expect(canvas.getByLabelText("Select row 1")).not.toBeDisabled()
    await expect(canvas.getByLabelText("Select row 3")).toBeDisabled()
  },
}

/* ── 31. Per-row action permissions ──────────────────────────────────────── */

const onArchive = fn()
const onDelete = fn()

export const PerRowActionPermissions: Story = {
  parameters: { docs: { description: { story: "Permission-dependent row actions are hidden or disabled with a meaningful record context." } } },
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
    await expect(adaRow.getByLabelText("Edit row 1")).not.toBeDisabled()
    await expect(adaRow.getByLabelText("Archive")).not.toBeDisabled()
    await expect(adaRow.queryByLabelText("Delete")).not.toBeInTheDocument()
    // Row 5 (Margaret, Viewer, suspended): edit and archive both blocked.
    const suspendedRow = within(rows[5] as HTMLElement)
    await expect(suspendedRow.getByLabelText("Edit row 5")).toBeDisabled()
    await expect(suspendedRow.getByLabelText("Archive")).toBeDisabled()
    await expect(suspendedRow.getByLabelText("Delete")).toBeInTheDocument()
  },
}

/* ── 32. Loading skeletons ───────────────────────────────────────────────── */

export const LoadingSkeletons: Story = {
  parameters: { docs: { description: { story: "Loading rows preserve the table layout and remain visible in light and dark themes while records are fetched." } } },
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
  parameters: { docs: { description: { story: "An appended skeleton row keeps existing records visible while another page is fetched." } } },
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
  parameters: { docs: { description: { story: "Reorder grips separate drag interaction from links, selection and record actions." } } },
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
      canvas.getByLabelText("Drag to reorder row 1")
    ).toBeInTheDocument()
  },
}

/* ── 35. Accessibility semantics ─────────────────────────────────────────── */

export const AccessibleSemantics: Story = {
  parameters: { docs: { description: { story: "Native table headings, record labels and selection controls expose the list to assistive technology." } } },
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

export const KeyboardColumnResize: Story = {
  args: { ...base, enableColumnResizing: true, enablePagination: false },
  parameters: { docs: { description: { story: "Focus a column edge and use Left/Right to resize, Shift for larger steps and Enter to restore its default width." } } },
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByRole("button", { name: "Resize First name" })
    const header = handle.closest("th")!
    const initial = header.getBoundingClientRect().width
    handle.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(header.getBoundingClientRect().width).toBeGreaterThan(initial)
    await userEvent.keyboard("{Enter}")
    await expect(header.getBoundingClientRect().width).toBeCloseTo(initial, 0)
    await expect(handle).toHaveFocus()
  },
}


export const EditorValidation: EmployeeStory = {
  parameters: { docs: { description: { story: "Required choices and approval errors stay next to their editor, with state icons and associated messages on the actual focus target." } } },
  args: {
    data: [{ ...employees[0] as Employee, department: "", skills: [], active: false }],
    columns: typedColumns.slice(0, 4).map((column) => ({
      ...column,
      meta: {
        ...column.meta,
        required: true,
        validate: column.id === "active" || ("accessorKey" in column && column.accessorKey === "active")
          ? (value) => value ? undefined : "Confirm the employee is active before saving."
          : undefined,
      },
    })),
    enableInlineEdit: true,
    size: "lg",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Edit row 0"))
    await userEvent.click(canvas.getByLabelText("Save row"))
    for (const label of ["Edit Department", "Edit Skills", "Edit Active"]) {
      const field = canvas.getByRole(label === "Edit Active" ? "switch" : "combobox", { name: label })
      await expect(field).toHaveAttribute("aria-invalid", "true")
      const errorId = field.getAttribute("aria-errormessage")
      const error = errorId ? canvasElement.ownerDocument.getElementById(errorId) : null
      await expect(error).not.toBeNull()
      await expect(field.getAttribute("aria-describedby")?.split(" ")).toContain(errorId)
      await expect(error?.querySelector('[aria-hidden="true"]')).not.toBeNull()
    }
  },
}


export const AsyncSaveRecovery: Story = {
  parameters: { docs: { description: { story: "A pending save keeps its draft, blocks duplicate submission and supports retry after a rejected persistence request." } } },
  args: { ...base, data: people.slice(0, 1), columns: inlineEditColumns, enableInlineEdit: true, onEditCommit: fn(), getRowLabel: (row) => row.original.firstName },
  render: (args) => {
    const [request, setRequest] = useState<{ resolve: () => void; reject: () => void } | null>(null)
    return <div className="flex flex-col gap-200">
      <DataTable {...args} onEditCommit={async (details) => {
        await args.onEditCommit?.(details)
        return new Promise<void>((resolve, reject) => {
          setRequest({
            resolve: () => { setRequest(null); resolve() },
            reject: () => { setRequest(null); reject(new Error("Simulated failure")) },
          })
        })
      }} />
      <div className="flex gap-100">
        <Button disabled={!request} theme="outlined" onClick={() => request?.reject()}>Simulate save failure</Button>
        <Button disabled={!request} onClick={() => request?.resolve()}>Complete save</Button>
      </div>
    </div>
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Edit Ada"))
    const input = canvas.getByLabelText("Edit First name")
    await userEvent.clear(input)
    await userEvent.type(input, "Augusta")
    await userEvent.click(canvas.getByLabelText("Save row"))
    await expect(canvas.getByLabelText("Save row")).toHaveAttribute("aria-disabled", "true")
    await expect(canvas.getByLabelText("Save row")).toHaveFocus()
    await expect(input).toHaveValue("Augusta")
    await expect(canvas.getByText("Saving row…")).toBeVisible()
    await userEvent.keyboard("{Enter}{Enter}")
    await expect(args.onEditCommit).toHaveBeenCalledTimes(1)
    await userEvent.click(canvas.getByRole("button", { name: "Simulate save failure" }))
    await expect(canvas.getByRole("alert")).toHaveTextContent("Could not save this row")
    await expect(input).toHaveValue("Augusta")
    await userEvent.click(canvas.getByLabelText("Save row"))
    await userEvent.click(canvas.getByRole("button", { name: "Complete save" }))
    await waitFor(() => expect(canvas.queryByLabelText("Edit First name")).toBeNull())
    await expect(args.onEditCommit).toHaveBeenCalledTimes(2)
  },
}

type RangeRow = { id: string; period: { from: string; to: string } }
export const RequiredDateRange: StoryObj<DataTableProps<RangeRow>> = {
  parameters: { docs: { description: { story: "Required date ranges reject cleared or reversed bounds on both Save and Enter, while supporting open-ended ranges." } } },
  args: {
    data: [{ id: "booking", period: { from: "2026-03-29", to: "2026-03-30" } }],
    columns: [{ accessorKey: "period", header: "Period", cell: () => "March booking", meta: { type: "dateRange", editable: true, required: true } }],
    getRowId: (row) => row.id,
    enableInlineEdit: true,
    onEditCommit: fn(),
  },
  render: (args) => <DataTable {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Edit row booking"))
    const from = canvas.getByLabelText("Edit Period from")
    const to = canvas.getByLabelText("Edit Period to")
    await userEvent.clear(from)
    await userEvent.clear(to)
    from.focus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onEditCommit).not.toHaveBeenCalled()
    await expect(canvas.getByRole("alert")).toHaveTextContent("Enter a value")
    await userEvent.type(from, "2026-04-01")
    await userEvent.type(to, "2026-03-29")
    await userEvent.click(canvas.getByLabelText("Save row"))
    await expect(args.onEditCommit).not.toHaveBeenCalled()
    await expect(canvas.getByRole("alert")).toHaveTextContent("start on or before the end")
    await userEvent.clear(to)
    await userEvent.click(canvas.getByLabelText("Save row"))
    await expect(args.onEditCommit).toHaveBeenCalledTimes(1)
  },
}

export const UnknownServerTotal: Story = {
  parameters: { docs: { description: { story: "Server pages with an unknown total expose previous/next navigation, with the response explicitly signaling exhaustion." } } },
  render: () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 2 })
    const records = people.slice(0, 5)
    return <DataTable {...base} data={records.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize)}
      enablePagination manualPagination pageCount={-1} pagination={pagination} onPaginationChange={setPagination}
      pageSizeOptions={[2, 5, 10]} hasNextPage={(pagination.pageIndex + 1) * pagination.pageSize < records.length} />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Previous page" })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "Next page" }))
    await expect(canvas.getByText("Page 2")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Next page" }))
    await expect(canvas.getByText("Page 3")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Next page" })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "Previous page" }))
    await expect(canvas.getByText("Page 2")).toBeVisible()
  },
}

export const ShrinkingServerTotal: Story = {
  parameters: { docs: { description: { story: "Deleting the last page requests the last available page once without rendering a reversed range or false empty success." } } },
  render: () => {
    const [count, setCount] = useState(5)
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState({ pageIndex: 2, pageSize: 2 })
    const records = people.slice(0, count)
    return <div className="flex flex-col gap-200">
      <DataTable {...base} data={records.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize)}
        enablePagination manualPagination rowCount={count} pagination={pagination} onPaginationChange={setPagination} pageSizeOptions={[2, 5, 10]} loading={loading} />
      <Button theme="outlined" onClick={() => { setLoading(true); setCount(0) }}>Start refetch</Button>
      <Button theme="outlined" onClick={() => { setCount(4); setLoading(false) }}>Delete last-page record</Button>
    </div>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("5–5 of 5")).toBeVisible()
    const current = canvasElement.querySelector<HTMLElement>('[aria-current="page"]')!
    current.focus()
    // Model a background refetch without moving the user's keyboard focus.
    canvas.getByRole("button", { name: "Start refetch" }).click()
    await waitFor(() => expect(canvas.getAllByText("Loading data")[0]).toBeInTheDocument())
    await expect(current).toHaveFocus()
    await expect(current.closest("nav")).toHaveAttribute("aria-disabled", "true")
    await userEvent.keyboard("{Enter}")
    await expect(current).toHaveFocus()
    canvas.getByRole("button", { name: "Delete last-page record" }).click()
    await waitFor(() => expect(canvas.getByText("3–4 of 4")).toBeVisible())
    await expect(canvasElement.querySelector('[aria-current="page"]')).toHaveFocus()
    // Normal activation still updates the page without navigating to a hash.
    const locationBefore = canvasElement.ownerDocument.defaultView?.location.href
    await userEvent.click(canvas.getByRole("link", { name: "page 1" }))
    await expect(canvas.getByText("1–2 of 4")).toBeVisible()
    await expect(canvasElement.ownerDocument.defaultView?.location.href).toBe(locationBefore)
  },
}

export const GroupedFixedWidths: Story = {
  parameters: { docs: { description: { story: "A leaf colgroup keeps mixed grouped and ungrouped fixed widths intact; only leaf headers expose resize handles." } } },
  args: {
    ...base, tableLayout: "fixed", enableColumnResizing: true,
    columns: [
      { id: "identity", header: "Identity", footer: "People", columns: [
        { accessorKey: "firstName", header: "First name", meta: { width: 200 } },
        { accessorKey: "lastName", header: "Last name", meta: { width: 200 } },
      ] },
      { accessorKey: "email", header: "Email", footer: "Contact details", meta: { width: 900 } },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByRole("columnheader", { name: /First name/ })
    await expect(first.getBoundingClientRect().width).toBeGreaterThan(190)
    await expect(canvas.queryByLabelText("Resize Identity")).toBeNull()
    canvas.getByLabelText("Resize First name").focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(first.getBoundingClientRect().width).toBeGreaterThan(205)
    await userEvent.keyboard("{Home}")
    await expect(first.getBoundingClientRect().width).toBeLessThan(205)
  },
}

export const CssWidthPointerResize: Story = {
  parameters: { docs: { description: { story: "Dragging a CSS-sized leaf starts from its rendered width rather than the table model's fallback width." } } },
  args: {
    ...base,
    tableLayout: "fixed",
    enableColumnResizing: true,
    columns: [
      { accessorKey: "firstName", header: "First name", meta: { width: "20rem" } },
      { accessorKey: "email", header: "Email", meta: { width: 900 } },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const handle = canvas.getByRole("button", { name: "Resize First name" })
    const header = handle.closest("th")!
    const initial = header.getBoundingClientRect().width
    const rect = handle.getBoundingClientRect()
    const clientX = rect.x + rect.width / 2
    const clientY = rect.y + rect.height / 2
    await userEvent.pointer([
      { target: handle, keys: "[MouseLeft>]", coords: { clientX, clientY } },
      { target: handle, coords: { clientX: clientX + 30, clientY } },
      { target: handle, keys: "[/MouseLeft]", coords: { clientX: clientX + 30, clientY } },
    ])
    await waitFor(() => expect(header.getBoundingClientRect().width - initial).toBeCloseTo(30, 0))
    await userEvent.dblClick(handle)
    await waitFor(() => expect(header.getBoundingClientRect().width).toBeCloseTo(initial, 0))
  },
}

export const InteractiveCellIsolation: Story = {
  parameters: { docs: { description: { story: "Buttons and prevented cell events do not also activate the surrounding clickable row." } } },
  args: {
    ...base, data: people.slice(0, 1), onRowClick: fn(),
    columns: [{ accessorKey: "firstName", header: "First name" }, { id: "inspect", header: "Details", cell: () => <Button theme="outlined">Inspect person</Button> }],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Inspect person" }))
    await expect(args.onRowClick).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByText("Ada"))
    await expect(args.onRowClick).toHaveBeenCalledTimes(1)
  },
}

export const SelectionEligibilityChanges: Story = {
  parameters: { docs: { description: { story: "A selected record remains individually deselectable after its eligibility changes, while new ineligible selections are refused." } } },
  render: () => {
    const [eligible, setEligible] = useState(true)
    return <div className="flex flex-col gap-200">
      <DataTable {...base} data={people.slice(0, 2)} enableRowSelection canSelectRow={() => eligible} />
      <Button theme="outlined" onClick={() => setEligible(false)}>Revoke eligibility</Button>
    </div>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const selected = canvas.getByLabelText("Select row 1")
    await userEvent.click(selected)
    await userEvent.click(canvas.getByRole("button", { name: "Revoke eligibility" }))
    await expect(selected).not.toBeDisabled()
    await expect(canvas.getByLabelText("Select row 2")).toBeDisabled()
    await userEvent.click(selected)
    await expect(selected).not.toBeChecked()
  },
}


export const MeasuredFrozenColumns: Story = {
  parameters: { docs: { description: { story: "CSS-string widths and trailing actions reserve their rendered space so multiple frozen columns never overlap." } } },
  args: {
    ...base, enableColumnPinning: true, stickyActions: true,
    columnPinning: { start: ["firstName", "lastName"], end: ["visits"] },
    columns: [
      { accessorKey: "firstName", header: "First name", meta: { width: "12rem" } },
      { accessorKey: "lastName", header: "Last name", meta: { width: "10rem" } },
      { accessorKey: "email", header: "Email", meta: { width: 900 } },
      { accessorKey: "visits", header: "Visits", meta: { width: 120 } },
    ],
    renderRowActions: () => <Button theme="outlined">Inspect</Button>,
  },
  play: async ({ canvasElement }) => {
    const headers = [...canvasElement.querySelectorAll("thead th")]
    const first = headers[0]!
    const second = headers[1]!
    if (getComputedStyle(second).position === "sticky") {
      await waitFor(() => expect(Number.parseFloat(getComputedStyle(second).insetInlineStart)).toBeCloseTo(first.getBoundingClientRect().width, 0))
    } else {
      await expect(getComputedStyle(second).insetInlineStart).toBe("auto")
    }
    const pinnedEnd = headers[3]!
    const actions = headers[4]!
    if (getComputedStyle(actions).insetInlineEnd !== "auto") {
      await waitFor(() => expect(Number.parseFloat(getComputedStyle(pinnedEnd).insetInlineEnd)).toBeCloseTo(actions.getBoundingClientRect().width, 0))
    }
  },
}

export const VariableHeightVirtualRows: Story = {
  parameters: { docs: { description: { story: "Windowed variable-height records and expanded detail rows are separately measured and keep stable record identities as scrolling reveals them." } } },
  args: {
    ...base, data: bigData, enableVirtualization: true, maxHeight: "26rem",
    enableExpanding: true, expanded: { "row-1": true },
    columns: [{ accessorKey: "firstName", header: "Person" }, {
      accessorKey: "email", header: "Notes", cell: ({ row }) => <div>{Array.from({ length: row.index % 3 + 1 }, (_, index) => <p key={`note-${index}`}>Contact preferences and delivery instructions for {row.original.firstName}.</p>)}</div>,
    }],
    renderExpandedRow: (row) => <div className="p-400"><p>Delivery details for {row.original.firstName}</p><p>Preferred collection at the workshop reception.</p></div>,
  },
}


export const OverlayIsolation: Story = {
  parameters: { docs: { description: { story: "Sticky Actions remain within the table's stacking context instead of painting over a foreground dialog while background rows scroll." } } },
  render: () => <div className="flex flex-col gap-200">
    <Dialog triggerText="Review customer notes" title="Customer notes" description="Review the delivery note without table controls obscuring it.">
      <Label htmlFor="table-overlay-notes">Delivery note</Label>
      <Textarea id="table-overlay-notes" defaultValue="Leave the parcel at the workshop reception." />
    </Dialog>
    <DataTable {...base} data={bigData} stickyHeader maxHeight="26rem"
      renderRowActions={() => <Button theme="outlined">Inspect</Button>} />
  </div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const document = canvasElement.ownerDocument
    await userEvent.click(canvas.getByRole("button", { name: "Review customer notes" }))
    const dialog = within(document.body).getByRole("dialog", { name: "Customer notes" })
    const textarea = within(dialog).getByLabelText("Delivery note")
    const scrollRegion = canvasElement.querySelector<HTMLElement>('section[aria-label="Scrollable records"]')!
    scrollRegion.scrollTop = 180
    textarea.focus()
    await waitFor(() => {
      const rect = textarea.getBoundingClientRect()
      expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe(textarea)
    })
    await userEvent.keyboard("{Escape}")
  },
}
