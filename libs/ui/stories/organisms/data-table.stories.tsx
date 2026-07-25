import type { Meta, StoryObj } from "@storybook/react"
import type { CellContext, ColumnDef } from "@tanstack/react-table"
import { type ComponentType, useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { ActionIcon } from "../../src/atoms/action-icon"
import { Badge } from "../../src/atoms/badge"
import { Input } from "../../src/atoms/input"
import {
  DataTable,
  type DataTableGetCellSpan,
  type DataTableProps,
} from "../../src/organisms/data-table"

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
    enableSorting: false,
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
    const valueInput = canvas.getByLabelText("Filter value for firstName")
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
    await expect(canvas.getByText("No team members")).toBeInTheDocument()
  },
}

/* ── 7. Row actions ──────────────────────────────────────────────────────── */

export const RowActions: Story = {
  args: {
    ...base,
    renderRowActions: (row) => (
      <ActionIcon
        aria-label={`Delete ${row.original.firstName}`}
        icon="token-icon-trash"
        onClick={() => fn()}
        size="sm"
        tone="danger"
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText("Delete Ada")).toBeInTheDocument()
  },
}

/* ── 8. Quick actions (hover affordance) ─────────────────────────────────── */

export const QuickActions: Story = {
  args: {
    ...base,
    renderQuickActions: (row) => (
      <ActionIcon
        aria-label={`Email ${row.original.firstName}`}
        icon="icon-[mdi--email-outline]"
        size="sm"
        tone="neutral"
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText("Email Ada")).toBeInTheDocument()
  },
}

/* ── 9. Frozen columns (left + right) ────────────────────────────────────── */

export const FrozenColumns: Story = {
  args: {
    ...base,
    enableColumnPinning: true,
    columnPinning: { left: ["firstName"], right: ["visits"] },
    maxHeight: "320px",
  },
}

/* ── 10. Sticky header ───────────────────────────────────────────────────── */

export const StickyHeader: Story = {
  args: { ...base, data: bigData.slice(0, 40), stickyHeader: true, maxHeight: "300px" },
}

/* ── 10b. Hidden header (headerless layout) ──────────────────────────────── */

export const HiddenHeader: Story = {
  args: { ...base, hideHeader: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // No column header, but data cells still render.
    await expect(canvas.queryByRole("columnheader")).not.toBeInTheDocument()
    await expect(canvas.getByText("Lovelace")).toBeInTheDocument()
  },
}

/* ── 11. Striped rows ────────────────────────────────────────────────────── */

export const StripedRows: Story = {
  args: { ...base, variant: "striped" },
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
      canvas.getAllByLabelText("Drag to reorder column").length
    ).toBeGreaterThan(0)
  },
}

/* ── 17. Row reorder ─────────────────────────────────────────────────────── */

export const RowReorder: Story = {
  args: { ...base, enableRowReorder: true, onRowReorder: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getAllByLabelText("Drag to reorder row").length
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
    await expect(
      canvas.getByRole("button", { name: /Columns/i })
    ).toBeInTheDocument()
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

/* ── 21. Inline row edit ─────────────────────────────────────────────────── */

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

export const InlineEdit: Story = {
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
    // Jump to the next page via the pager's page-2 control.
    const page2 = canvas.queryByRole("link", { name: "2" })
    if (page2) {
      await userEvent.click(page2)
      await expect(args.onPaginationChange).toHaveBeenCalled()
    }
  },
}
