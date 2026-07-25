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
| `string` | Input + condition menu (icon) | Input |
| `int` / `number` | Input + condition menu (`between` adds a second Input) | NumericInput |
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

The filter row puts the value control first and the operator behind a compact
icon button (a Menu of conditions), so the input gets the width and the header
stays on one line. The active condition is in the button's `aria-label`, and for
`Is empty` / `Is not empty` the input is disabled and shows the condition as its
placeholder.

Row actions use the `Button` atom icon-only at `size="sm"`, `theme="borderless"`,
with `variant` carrying the semantics (`danger` for destructive actions).

Escape hatches, in precedence order: `meta.renderFilter` / `meta.renderEditor`
per column → the table-wide `renderHeaderFilter` slot → `filterRenderers` /
`editorRenderers` maps → the type default. All receive a context with
`{ column, type, value, setValue, disabled, size, options }` (editors also get
`row`, `error`, `commit`, `cancel`).

## Column widths and alignment

```tsx
{ accessorKey: "age", meta: { width: 80, align: "end" } }
{ accessorKey: "email", meta: { width: "var(--dimension-200)", minWidth: 120 } }
{ accessorKey: "active", meta: { width: "15%", align: "center" } }
```

`meta.width` / `meta.minWidth` / `meta.maxWidth` take a number (px) or any CSS
length, so tokens, `%` and `ch` all work. Pair them with `tableLayout="fixed"`
— under the default `"auto"` a width is only a hint and long content can still
stretch the column.

Use `meta.width`, not TanStack's `columnDef.size`: TanStack merges `size: 150`
into every column def, so `size` cannot express "no width declared". `size`
still drives `enableColumnResizing`, and while resizing is on the live dragged
width wins over `meta.width`.

`meta.align` (`start | center | end`, default `start`) is forwarded to the
`Table` cell as `data-align`, which is where the alignment is actually styled —
so a hand-written `Table` gets the same three options. Nothing is inferred from
the column type: center an icon/boolean column or right-align a number only if
you say so. `Table`'s older `numeric` prop still right-aligns, but it means
"this value is a number"; set one or the other, not both.

## Inline editing and interaction locking

The table renders read-only until the user opts in: the right-hand actions cell
holds an edit icon, and clicking it swaps that row's editable cells
(`meta.editable`) to type-driven editors with save and cancel beside them.
`enableInlineEdit` is what wires this up. One row is editable at a time; Enter
commits, Escape cancels. Apply the committed `draft` to your own state in
`onEditCommit` — DataTable does not mutate `data`.

For a column that should always be an editor instead, skip `enableInlineEdit`
and render your own control in `columnDef.cell`, pushing values through
`table.options.meta.updateData` (see "Inline edit" below). Validation runs on
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

Reorder handles are always rendered but stay fully transparent until the row or
header is hovered or receives focus, so the table stays calm while still being
discoverable. They also reveal while their row/header is being dragged, so the
handle does not vanish when the pointer leaves the source.
During a drag the source is dimmed and lifted (`data-dragging`),
and the drop target shows an insertion edge — a border on the leading or
trailing side for columns, top or bottom for rows — so it is clear where the
item will land.

## Accessibility

Sortable headers carry `aria-sort`; the expander carries `aria-expanded`; the
table carries `aria-busy` while loading and skeleton rows are hidden from
assistive tech. Rows with `onRowClick` are focusable and activate on Enter or
Space (the handler ignores keys bubbling from controls inside the row). Both
drag handles receive dnd-kit's keyboard attributes, so reordering works without
a mouse. Pass `getRowLabel` so selection checkboxes and the edit action are
labelled by row content instead of an opaque row id. Inline-edit validation
messages render next to the field with `role="alert"` and are linked through
`aria-describedby`; focus moves into the edited row on start and returns to the
control that opened it on commit or cancel.

## Sizing

`size` (`sm | md | lg`) is forwarded to the underlying `Table` **and** to every
nested control — filter inputs, inline editors, page-size select, pagination,
action icons and the column menu — so the whole table scales as one.
`paginationProps` exposes the full `Pagination` molecule API (variant, compact,
siblingCount, translations, …) except the table-owned count/page/pageSize. The
footer aligns right — page size, then the pager, then the record range — and
shares the header's background so the two frame the table consistently.

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
- `enableExpanding` — the expand toggle lives in the trailing actions cell, so it never collides with the selection checkbox. Pair with `getSubRows` for tree rows, or with `renderExpandedRow` alone for master-detail (every row becomes expandable; narrow it with `getRowCanExpand`). The detail renders as one full-width cell spanning every column, containing a plain `div` — put any layout inside, no nested table cells.
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
`renderHeaderFilter(column)`, `renderExpandedRow(row)`,
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
`Table`. Use `stickyHeader` with `maxHeight` for a scrolling body and
`hideHeader` for headerless layouts.

The whole grid is one rounded card: the wrapper carries `rounded-table` and
clips its children, so the corners are correct with a toolbar, a pagination
footer, both, or neither — including the empty state. `variant="outline"` draws
its border on that wrapper rather than on the `<table>`, so the toolbar and
footer sit inside the outline instead of beside it.

`striped` is a standalone boolean, so zebra rows compose with any variant —
prefer it over `variant="striped"`, which cannot be combined with `outline`.

Setting `onRowClick` automatically makes rows interactive (pointer cursor +
hover background); the affordance is dropped while an inline edit locks row
clicks, so rows never look clickable when they are not.

## Don'ts

- Do not hardcode colors/padding — the grid is fully tokenised via `Table`.
- Do not reach for a canvas grid (VTable/S2): they cannot use our Tailwind tokens.
- Do not mutate `data` in place for row reorder — apply the `onRowReorder` `data` result to your state.
