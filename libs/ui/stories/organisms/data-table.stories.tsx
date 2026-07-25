import type { Meta, StoryObj } from "@storybook/react"
import type { CellContext, ColumnDef } from "@tanstack/react-table"
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
    // With 500 rows and a page size of 5, page 2 always exists — hard-assert it
    // so a broken pager fails the story instead of silently skipping.
    await userEvent.click(canvas.getByRole("link", { name: "2" }))
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

const typedMeta = {
  columns: typedColumns,
  data: employees,
} as unknown as Partial<DataTableProps<Person>>

export const TypedColumnFilters: Story = {
  args: {
    ...typedMeta,
    enableColumnFilters: true,
    enableSorting: true,
    onColumnFiltersChange: fn(),
  } as DataTableProps<Person>,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText("Filter active")).toBeInTheDocument()
    await expect(canvas.getByLabelText("Filter shiftStart from")).toBeInTheDocument()
    await userEvent.type(canvas.getByLabelText("Filter startDate"), "2021-01-01")
    await expect(args.onColumnFiltersChange).toHaveBeenCalled()
  },
}

/* ── 24. Custom filter template for a non-standard column type ───────────── */

export const CustomFilterTemplate: Story = {
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
    ] as unknown as ColumnDef<Person>[],
    enableColumnFilters: true,
    onColumnFiltersChange: fn(),
  } as DataTableProps<Person>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText("Salary band")).toBeInTheDocument()
  },
}

/* ── 25. Inline edit driven by column type + sticky actions ──────────────── */

export const InlineEditByColumnType: Story = {
  args: {
    ...typedMeta,
    enableInlineEdit: true,
    stickyActions: true,
    onEditStart: fn(),
    onEditCommit: fn(),
    onEditCancel: fn(),
  } as DataTableProps<Person>,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText("Edit row 0"))
    await expect(args.onEditStart).toHaveBeenCalled()
    // Type-driven editors replace the cells of the edited row only.
    await expect(canvas.getByLabelText("Edit name")).toBeInTheDocument()
    await expect(canvas.getByLabelText("Edit startDate")).toBeInTheDocument()
    await userEvent.click(canvas.getByLabelText("Save row"))
    await expect(args.onEditCommit).toHaveBeenCalled()
  },
}

/* ── 26. Edit mode locks filtering, selection and sorting ────────────────── */

export const EditModeLocksInteractions: Story = {
  args: {
    ...typedMeta,
    enableInlineEdit: true,
    enableColumnFilters: true,
    enableRowSelection: true,
    enableSorting: true,
    onInteractionBlocked: fn(),
  } as DataTableProps<Person>,
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

export const SizeSynchronised: Story = {
  args: {
    ...typedMeta,
    size: "lg",
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableInlineEdit: true,
    enablePagination: true,
    pageSizeOptions: [2, 5],
  } as DataTableProps<Person>,
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
    // Both handles are discoverable and labelled.
    await expect(
      canvas.getAllByLabelText("Drag to reorder column").length
    ).toBeGreaterThan(0)
    await expect(
      canvas.getAllByLabelText("Drag to reorder row").length
    ).toBeGreaterThan(0)
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
    await expect(ageHeader).toHaveAttribute("aria-sort", "ascending")
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
