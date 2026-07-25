---
component_version: "1.0.0"
name: data-table-usage
description: >
  Use after component-usage-ux when an app needs the @techsio/ui-kit DataTable —
  a headless, data-driven grid built on @tanstack/react-table that renders into
  the presentational Table organism. Covers column defs, sorting, conditional
  column filters, global search, row selection, column visibility/pinning/reorder,
  row reorder, tree/expanding rows, inline edit, colSpan/rowSpan, virtualization /
  infinite scroll and pagination — every feature behind a flag with a callback.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - table-usage
sources:
  - "libs/ui/src/organisms/data-table.tsx"
  - "libs/ui/src/organisms/data-table.helpers.ts"
  - "libs/ui/stories/organisms/data-table.stories.tsx"
---

# @techsio/ui-kit DataTable Usage

`DataTable` is the data-driven grid. It owns the TanStack table instance and
renders into the presentational `Table` organism, so it inherits every
`--color-table-*` / `--padding-table-cell-*` token. Reach for the plain `Table`
when you only need static markup; reach for `DataTable` when you need
sorting/filtering/selection/pagination and friends.

## Setup

```tsx
import { DataTable } from "@techsio/ui-kit/organisms/data-table"
import type { ColumnDef } from "@techsio/ui-kit/organisms/data-table"

type Order = { id: string; customer: string; total: number; status: string }

const columns: ColumnDef<Order>[] = [
  { accessorKey: "customer", header: "Customer" },
  {
    accessorKey: "total",
    header: "Total",
    meta: { align: "end", filterVariant: "number" },
    cell: (info) => `${info.getValue<number>()} €`,
  },
  { accessorKey: "status", header: "Status", meta: { filterVariant: "select" } },
]

<DataTable
  columns={columns}
  data={orders}
  enableSorting
  enableGlobalFilter
  enablePagination
  onRowClick={(row) => open(row.original)}
/>
```

## Column types drive the filter and the editor

Declare `meta.type` and DataTable renders the matching ui-kit control in both the
header filter row and the inline row editor, at the table's `size`:

| `meta.type` | filter control | editor control |
|---|---|---|
| `string` | operator Select + Input | Input |
| `int` / `number` | operator Select + Input (`between` adds a second) | NumericInput |
| `boolean` | tri-state Select (All/Yes/No) | Switch |
| `enum` | Select (+ "All") | Select |
| `multiEnum` | Combobox `multiple` | Combobox `multiple` |
| `date` / `datetime` | Input `date` / `datetime-local` | same |
| `time` | from/to time Inputs (window may cross midnight) | Input `time` |
| `dateRange` | from/to date Inputs | from/to date Inputs |
| `custom` | nothing — supply `meta.renderFilter` | supply `meta.renderEditor` |

Give `enum`/`multiEnum` their choices via `meta.options`. Register
`filterFn: "typed"` on the column so filtering matches the declared type
(`time` compares minutes-since-midnight; a `dateRange` cell compares interval
overlap). There is no date-picker component yet, so date/time fields use the
native `Input` types.

Escape hatches, in precedence order: `meta.renderFilter` / `meta.renderEditor`
per column → the table-wide `renderHeaderFilter` slot → `filterRenderers` /
`editorRenderers` maps → the type default. All receive a context with
`{ column, type, value, setValue, disabled, size, options }` (editors also get
`row`, `error`, `commit`, `cancel`).

## Inline editing and interaction locking

`enableInlineEdit` turns the right-hand actions cell into edit/save/cancel and
swaps the edited row's editable cells (`meta.editable`) to type-driven editors.
One row is editable at a time; Enter commits, Escape cancels. Validation runs on
commit from `meta.required` and `meta.validate(value, draft)`; failures block the
commit and surface through `onEditValidationError`.

While a row is being edited, `lockInteractionsWhileEditing` (default `true`)
disables sorting, column filters, global search, pagination, selection, row and
column reorder, and row click — anything that could move the row out from under
the user. Every blocked attempt reports through
`onInteractionBlocked({ action, reason: "editing", rowId })`. Filtering and
sorting still compose freely with each other when no edit is active.

Edit callbacks: `onEditStart`, `onEditChange`, `onEditCommit`, `onEditCancel`
(with `dirty`), `onEditValidationError`, plus controlled `editingRowId` /
`onEditingRowIdChange`.

## Loading states

- `loading` replaces the body with `loadingRowCount` skeleton rows (default 5)
  while keeping the header, so the layout does not jump when data arrives.
- `loadingMore` appends a single skeleton row — pair it with `onReachEnd` for
  infinite scroll so the user sees the next page being fetched.

## Drag affordances

Reorder handles are always rendered but sit at reduced opacity until the row or
header is hovered/focused, so the table stays calm while still being
discoverable. During a drag the source is dimmed and lifted (`data-dragging`),
and the drop target shows an insertion edge — a border on the leading or
trailing side for columns, top or bottom for rows — so it is clear where the
item will land.

## Sizing

`size` (`sm | md | lg`) is forwarded to the underlying `Table` **and** to every
nested control — filter inputs, inline editors, page-size select, pagination,
action icons and the column menu — so the whole table scales as one.
`paginationProps` exposes the full `Pagination` molecule API (variant, compact,
siblingCount, translations, …) except the table-owned count/page/pageSize.

## Feature flags (all opt-in unless noted)

- `enableSorting` (default `true`) — click header to sort; `meta.align: "end"` right-aligns numeric columns.
- `enableGlobalFilter` — renders the toolbar search (`DataTable.GlobalSearch`).
- `enableColumnFilters` — renders a per-column filter row. The default control is operator-based ("with conditions"); pick the input via `meta.filterVariant: "text" | "number" | "range" | "select"` (+ `meta.filterOptions` for `select`). Register `filterFn: "conditional"` on the column, or override the whole UI with `renderHeaderFilter`.
- `enableRowSelection` — injects a leading checkbox column; header checkbox toggles all.
  Constrain it with `selectionMode: "single" | "multiple"` (single replaces the
  selection), `maxSelectedRows: N` (a hard cap — unselected rows disable once it
  is reached, selected ones stay deselectable, and `onSelectionLimitReached`
  fires) and/or `canSelectRow(row, { selectedCount, isSelected })` for rules
  those two can't express. All three compose; the select-all header checkbox is
  hidden unless selection is unbounded multiple.
- `enableColumnVisibility` — toolbar menu to show/hide columns.
- `enableColumnPinning` + controlled `columnPinning` — freeze columns left/right (sticky, with an edge shadow).
- `enableColumnReorder` — drag column headers (dnd-kit); fires `onColumnReorder`.
- `enableRowReorder` — injects a drag handle column; fires `onRowReorder`.
- `enableExpanding` + `getSubRows` — tree rows; injects an expander column. Use `renderExpandedRow` for master-detail content.
- `enablePagination` — renders `DataTable.Pagination` ("start–end of total" + page-size select + pager). Configure `pageSizeOptions`.
- `enableVirtualization` + `maxHeight` — windowed rendering for large datasets (keeps native column alignment). Set `estimateRowHeight`.
- `enableColumnResizing` — draggable column widths (`columnResizeMode: "onChange"`); widths are applied inline per cell.
- `enableInlineEdit` — type-driven row editing with an edit/save/cancel actions cell (see above).
- `stickyActions` (default `true`) — pin the row-actions cell to the right edge.
- `hideHeader` — render without the column header row(s).
- `onReachEnd` + `maxHeight` — infinite scroll; called once when scrolled near the bottom.

Server-driven data: set `manualSorting` / `manualFiltering` / `manualPagination` and supply `rowCount` (or `pageCount`) so pagination totals stay correct.

## Callbacks (for interaction tests + app wiring)

Every stateful feature is controllable via a `state` + `onXChange` pair and also
exposes a plain callback: `onRowClick`, `onSortingChange`, `onColumnFiltersChange`,
`onGlobalFilterChange`, `onRowSelectionChange`, `onColumnVisibilityChange`,
`onColumnOrderChange`, `onColumnPinningChange`, `onExpandedChange`,
`onPaginationChange`, `onColumnReorder`, `onRowReorder`, `onCellEditCommit`, and
`onReady(table)` (the raw TanStack instance for deep access).

## Slots (open DOM paths)

`renderToolbar(table)`, `renderEmpty()`, `renderRowActions(row)`,
`renderQuickActions(row)`, `renderHeaderFilter(column)`, `renderExpandedRow(row)`,
and `slotProps.{root,header,body,row}` for className/data-attr/ref passthrough.
Compose the toolbar/pagination yourself with `DataTable.Toolbar`,
`DataTable.GlobalSearch`, `DataTable.ColumnVisibility`, `DataTable.Pagination`.

## colSpan / rowSpan

TanStack has no body-cell spanning model. Pass `getCellSpan(cell, ctx)` returning
`{ colSpan?, rowSpan?, hidden? }`; mark cells swallowed by a span with `hidden: true`.

## Inline edit

Set `meta.editable` on a column and render an editable control in `columnDef.cell`
that calls `table.options.meta.updateData(rowId, columnId, value)`; DataTable
forwards it to `onCellEditCommit`.

## Presentation

`variant` (`line | outline | striped`), `size` (`sm | md | lg`), `stickyHeader`,
`showColumnBorder`, `hideHeader`, `caption` — all forwarded to the underlying
`Table`. Use `variant="striped"` for zebra rows, `stickyHeader` with `maxHeight`
for a scrolling body, and `hideHeader` for headerless layouts.

## Don'ts

- Do not hardcode colors/padding — the grid is fully tokenised via `Table`.
- Do not reach for a canvas grid (VTable/S2): they cannot use our Tailwind tokens.
- Do not mutate `data` in place for row reorder — apply the `onRowReorder` `data` result to your state.
