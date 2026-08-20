/**
 * DataTable helpers — types, conditional filter operators and pin styling.
 *
 * Kept separate from `data-table.tsx` so the component file stays focused on
 * rendering. Re-exported through `data-table.tsx` for consumers.
 */
import {
  filterFns as builtInFilterFns,
  sortFns as builtInSortFns,
  type CellData,
  type ColumnPinningPosition,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  type ReactTable,
  type RowData,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  type TableFeatures,
  type Cell as TanstackCell,
  type CellContext as TanstackCellContext,
  type Column as TanstackColumn,
  type ColumnDef as TanstackColumnDef,
  type FilterFn as TanstackFilterFn,
  type Header as TanstackHeader,
  type Row as TanstackRow,
  tableFeatures,
} from "@tanstack/react-table"
import type { CSSProperties, ReactNode } from "react"

/** The feature set every DataTable type is parameterised by. */
export type DataTableFeatures = typeof dataTableFeatures

/* ── Feature-bound aliases ────────────────────────────────────────────────
 * v9 threads `TFeatures` through every public type. These aliases pin it to
 * DataTable's set so consumers keep writing `ColumnDef<Person>` rather than
 * `ColumnDef<typeof dataTableFeatures, Person>`. */
export type Cell<
  T extends RowData,
  V extends CellData = CellData,
> = TanstackCell<DataTableFeatures, T, V>
export type CellContext<
  T extends RowData,
  V extends CellData = CellData,
> = TanstackCellContext<DataTableFeatures, T, V>
export type Column<
  T extends RowData,
  V extends CellData = CellData,
> = TanstackColumn<DataTableFeatures, T, V>
export type ColumnDef<
  T extends RowData,
  V extends CellData = CellData,
> = TanstackColumnDef<DataTableFeatures, T, V>
export type Row<T extends RowData> = TanstackRow<DataTableFeatures, T>
/**
 * The instance `useTable` hands back. It is the React wrapper rather than the
 * core table: only the wrapper carries `table.state` and `table.Subscribe`,
 * and both are part of what DataTable hands to `onReady`/`renderToolbar`.
 */
export type TanstackTable<T extends RowData> = ReactTable<DataTableFeatures, T>
export type Header<
  T extends RowData,
  V extends CellData = CellData,
> = TanstackHeader<DataTableFeatures, T, V>
export type FilterFn<T extends RowData> = TanstackFilterFn<DataTableFeatures, T>

import type {
  DataTableColumnType,
  DataTableEditorContext,
  DataTableFilterContext,
  DataTableOption,
} from "./data-table.fields"
import { typedFilterMatch } from "./data-table.fields"

/**
 * Signature for the filter functions DataTable registers on its own feature
 * set. `TFeatures` is left as `any` on purpose: the feature set is defined in
 * terms of these functions, so naming it here would make the type circular.
 * TanStack widens an `any` feature set to the full API surface, so nothing is
 * lost inside the function body.
 */
// biome-ignore lint/suspicious/noExplicitAny: breaks a circular type reference — see above
type AnyFilterFn = TanstackFilterFn<any, any>

/* ── Column meta augmentation ─────────────────────────────────────────────
 * Lets a column declare how it filters, aligns and edits without leaking
 * DataTable concerns into every consumer's ColumnDef. */
declare module "@tanstack/table-core" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires interface
  interface ColumnMeta<
    // TypeScript requires a merged declaration to repeat the upstream
    // parameter list verbatim, names included, even though this augmentation
    // only reads TData.
    // biome-ignore lint/correctness/noUnusedVariables: see above
    TFeatures extends TableFeatures,
    TData extends RowData,
    // biome-ignore lint/correctness/noUnusedVariables: see above
    TValue,
  > {
    /**
     * Horizontal alignment of the column's header and cells. Purely a
     * presentation choice — nothing is inferred from the column type, so a
     * boolean/icon column is centered and a number right-aligned only if you
     * say so. Defaults to `"start"`.
     */
    align?: "start" | "center" | "end"
    /**
     * Fixed column width. A number is treated as `px`; a string is used as-is,
     * so design tokens (`"var(--dimension-120)"`), percentages and `ch` all
     * work. Widths are only honoured exactly with `tableLayout="fixed"`.
     */
    width?: DataTableColumnWidth
    /** Lower bound for the column width (same units as `width`). */
    minWidth?: DataTableColumnWidth
    /** Upper bound for the column width (same units as `width`). */
    maxWidth?: DataTableColumnWidth
    /**
     * Declared data type. Drives which ui-kit control DataTable renders in the
     * header filter row and in the inline row editor. Use `"custom"` (or omit)
     * together with `renderFilter`/`renderEditor` for non-standard columns.
     */
    type?: DataTableColumnType
    /** Choices for `enum` / `multiEnum` columns (filter + editor). */
    options?: DataTableOption[]
    /** Enable inline editing for this column's cells. */
    editable?: boolean
    /** Reject an empty value on commit. */
    required?: boolean
    /** Per-field validation run on commit; return a message to block it. */
    validate?: (
      value: unknown,
      draft: Record<string, unknown>
    ) => string | undefined
    /** Escape hatch: render this column's header filter yourself. */
    renderFilter?: (ctx: DataTableFilterContext<TData>) => ReactNode
    /** Escape hatch: render this column's inline editor yourself. */
    renderEditor?: (ctx: DataTableEditorContext<TData>) => ReactNode

    /** @deprecated use `type` — kept so existing columns keep working. */
    filterVariant?: "text" | "number" | "range" | "select"
    /** @deprecated use `options`. */
    filterOptions?: DataTableOption[]
  }

  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires interface
  // biome-ignore lint/correctness/noUnusedVariables: augmentation signature must match upstream generics
  interface TableMeta<TFeatures extends TableFeatures, TData extends RowData> {
    /** Commit an inline cell edit; wired by DataTable to `onCellEditCommit`. */
    updateData?: (rowId: string, columnId: string, value: unknown) => void
  }
}

/**
 * Filter function that dispatches on the column's declared `meta.type`, so a
 * `boolean`/`enum`/`date` column filters correctly without the consumer wiring
 * a comparator. Registered by DataTable as `filterFn: "typed"`.
 */
export const typedFilterFn: AnyFilterFn = (row, columnId, filterValue) => {
  const type =
    row.getAllCells().find((c) => c.column.id === columnId)?.column.columnDef
      .meta?.type ?? "string"
  return typedFilterMatch(type, row.getValue(columnId), filterValue)
}

/* ── Conditional (operator-based) filtering ──────────────────────────────── */

export type DataTableFilterOperator =
  | "contains"
  | "notContains"
  | "equals"
  | "notEquals"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "empty"
  | "notEmpty"

/** Value shape stored in `columnFilters` when using `conditionalFilterFn`. */
export type DataTableConditionalFilterValue = {
  operator: DataTableFilterOperator
  value?: unknown
  /** Upper bound for the `between` operator. */
  to?: unknown
}

export const TEXT_FILTER_OPERATORS: {
  label: string
  value: DataTableFilterOperator
}[] = [
  { label: "Contains", value: "contains" },
  { label: "Does not contain", value: "notContains" },
  { label: "Equals", value: "equals" },
  { label: "Does not equal", value: "notEquals" },
  { label: "Starts with", value: "startsWith" },
  { label: "Ends with", value: "endsWith" },
  { label: "Is empty", value: "empty" },
  { label: "Is not empty", value: "notEmpty" },
]

export const NUMBER_FILTER_OPERATORS: {
  label: string
  value: DataTableFilterOperator
}[] = [
  { label: "=", value: "equals" },
  { label: "≠", value: "notEquals" },
  { label: ">", value: "gt" },
  { label: "≥", value: "gte" },
  { label: "<", value: "lt" },
  { label: "≤", value: "lte" },
  { label: "Between", value: "between" },
  { label: "Is empty", value: "empty" },
  { label: "Is not empty", value: "notEmpty" },
]

const isBlank = (v: unknown) => v == null || v === ""

function evaluateCondition(
  cellValue: unknown,
  { operator, value, to }: DataTableConditionalFilterValue
): boolean {
  if (operator === "empty") {
    return isBlank(cellValue)
  }
  if (operator === "notEmpty") {
    return !isBlank(cellValue)
  }
  // For every other operator an empty filter value means "no constraint".
  if (isBlank(value) && operator !== "between") {
    return true
  }

  const text = String(cellValue ?? "").toLowerCase()
  const query = String(value ?? "").toLowerCase()
  const num = Number(cellValue)
  const target = Number(value)

  // A half-typed number ("-", "1e", ".") parses to NaN, and every comparison
  // against NaN is false — which would empty the table mid-keystroke. Treat it
  // as "no constraint yet", matching how `between` already guards its bounds.
  const numericOperator =
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte"
  if (numericOperator && Number.isNaN(target)) {
    return true
  }

  switch (operator) {
    case "contains":
      return text.includes(query)
    case "notContains":
      return !text.includes(query)
    case "equals":
      return text === query
    case "notEquals":
      return text !== query
    case "startsWith":
      return text.startsWith(query)
    case "endsWith":
      return text.endsWith(query)
    case "gt":
      return num > target
    case "gte":
      return num >= target
    case "lt":
      return num < target
    case "lte":
      return num <= target
    case "between": {
      const lo = Number(value)
      const hi = Number(to)
      const hasLo = !(isBlank(value) || Number.isNaN(lo))
      const hasHi = !(isBlank(to) || Number.isNaN(hi))
      if (hasLo && num < lo) {
        return false
      }
      if (hasHi && num > hi) {
        return false
      }
      return true
    }
    default:
      return true
  }
}

/**
 * TanStack `filterFn` implementing operator-based ("with conditions") column
 * filtering. Register on a column via `filterFn: conditionalFilterFn` and store
 * `{ operator, value, to? }` as the filter value.
 */
export const conditionalFilterFn: AnyFilterFn = (
  row,
  columnId,
  filterValue: DataTableConditionalFilterValue
) => {
  if (!filterValue?.operator) {
    return true
  }
  return evaluateCondition(row.getValue(columnId), filterValue)
}

/* ── Column widths ────────────────────────────────────────────────────────
 * TanStack tracks a numeric `size` used by the resizing feature. Columns that
 * are only ever declaratively sized need `%`, `ch` and token values too, hence
 * the wider `meta.width` shape sitting alongside it. */

/** A column width: a number (px) or any CSS length, including `var(--token)`. */
export type DataTableColumnWidth = number | string

const toCssLength = (value: DataTableColumnWidth | undefined) =>
  typeof value === "number" ? `${value}px` : value

/**
 * Mirrors numeric `meta.width` / `meta.minWidth` / `meta.maxWidth` into
 * TanStack's own `size` / `minSize` / `maxSize`.
 *
 * Without this the two disagree: sticky offsets for pinned columns come from
 * `column.getStart()`, which sums `getSize()`, so a frozen column rendered at
 * `meta.width: 80` would push its neighbour by TanStack's default 150 and the
 * frozen block would be misaligned. Resizing would drift the same way.
 *
 * CSS-string widths (`"15%"`, `"var(--dimension-120)"`) cannot be resolved to
 * pixels here, so they stay CSS-only — see `getColumnSizeStyles`.
 */
export function applyDeclaredColumnSizes<T extends RowData>(
  columns: ColumnDef<T, unknown>[]
): ColumnDef<T, unknown>[] {
  return columns.map((column) => {
    const group = column as { columns?: ColumnDef<T, unknown>[] }
    const next: ColumnDef<T, unknown> = group.columns
      ? ({
          ...column,
          columns: applyDeclaredColumnSizes(group.columns),
        } as ColumnDef<T, unknown>)
      : { ...column }

    const meta = next.meta
    if (typeof meta?.width === "number" && next.size === undefined) {
      next.size = meta.width
    }
    if (typeof meta?.minWidth === "number" && next.minSize === undefined) {
      next.minSize = meta.minWidth
    }
    if (typeof meta?.maxWidth === "number" && next.maxSize === undefined) {
      next.maxSize = meta.maxWidth
    }
    return next
  })
}

/**
 * Resolves the inline sizing styles for a column.
 *
 * `meta.width` is the declarative API. `columnDef.size` is deliberately *not*
 * read as a fallback: TanStack merges `size: 150` into every column def, so it
 * cannot distinguish a declared width from the default. Numeric widths are
 * mirrored into `size` by `applyDeclaredColumnSizes`, so `getSize()` is the
 * authority for them and the rendered width always matches the sticky offsets.
 * String widths stay CSS-only, and while resizing is on the live dragged size
 * wins so dragging stays responsive.
 */
export function getColumnSizeStyles<T extends RowData>(
  column: Column<T>,
  enableColumnResizing?: boolean
): CSSProperties {
  const meta = column.columnDef.meta
  const declared = meta?.width
  const fromTanstack = enableColumnResizing || typeof declared === "number"

  return {
    width: toCssLength(fromTanstack ? column.getSize() : declared),
    minWidth: toCssLength(meta?.minWidth),
    maxWidth: toCssLength(meta?.maxWidth),
  }
}

/* ── Column pinning (freeze) styling ─────────────────────────────────────── */

/**
 * Sticky-positioning styles for a pinned (frozen) column. Applied inline
 * because the offsets are data-driven (`getStart`/`getAfter`). The visual
 * treatment (shadow at the frozen edge) is done via `data-pinned` + tokens.
 */
/**
 * Stacking order for sticky cells. A pinned header cell must beat both the
 * sticky header row (z-10 from the Table organism) and pinned body cells,
 * otherwise a frozen column's header is painted over while scrolling.
 */
export const DATA_TABLE_Z = {
  pinnedCell: 1,
  pinnedHeaderCell: 20,
} as const

export function getPinningStyles<T extends RowData>(
  column: Column<T>,
  kind: "header" | "body" = "body"
): CSSProperties {
  const pinned = column.getIsPinned()
  if (!pinned) {
    return {}
  }
  return {
    position: "sticky",
    left: pinned === "start" ? `${column.getStart("start")}px` : undefined,
    right: pinned === "end" ? `${column.getAfter("end")}px` : undefined,
    zIndex:
      kind === "header"
        ? DATA_TABLE_Z.pinnedHeaderCell
        : DATA_TABLE_Z.pinnedCell,
  }
}

/** True when this column is the last of the left-pinned group (edge shadow). */
export function isLastLeftPinned<T extends RowData>(
  column: Column<T>
): boolean {
  return (
    column.getIsPinned() === "start" && column.getIsLastColumn("start") === true
  )
}

/** True when this column is the first of the right-pinned group (edge shadow). */
export function isFirstRightPinned<T extends RowData>(
  column: Column<T>
): boolean {
  return (
    column.getIsPinned() === "end" && column.getIsFirstColumn("end") === true
  )
}

/**
 * Maps v9's logical pin positions back to the physical `left`/`right` values
 * DataTable has always written to `data-pinned`. Consumers style against that
 * attribute, so the rename stays inside the component.
 */
export function pinnedSide(
  pinned: ColumnPinningPosition
): "left" | "right" | undefined {
  if (pinned === "start") {
    return "left"
  }
  if (pinned === "end") {
    return "right"
  }
  return
}

/* ── colSpan / rowSpan ────────────────────────────────────────────────────
 * TanStack has no body-cell spanning model, so DataTable exposes a `getCellSpan`
 * hook returning this shape. `hidden` drops a cell swallowed by a preceding
 * span. */
export type DataTableCellSpan = {
  colSpan?: number
  rowSpan?: number
  hidden?: boolean
}

export type DataTableGetCellSpan<T extends RowData> = (
  cell: Cell<T, unknown>,
  context: { row: Row<T>; rows: Row<T>[]; rowIndex: number }
) => DataTableCellSpan | undefined

/* Convenience re-export so consumers can type the instance from one import. */
export type DataTableInstance<T extends RowData> = TanstackTable<T>

/* ── TanStack Table v9 feature set ────────────────────────────────────────
 * v9 no longer ships every feature with the table: each one has to be listed
 * here, and the row-model factories that used to be per-instance options
 * (`getSortedRowModel()` and friends) are registered alongside them. The set is
 * built once at module scope — TanStack requires it to be referentially stable,
 * and it is what every `Column`/`Row`/`Cell` type below is parameterised by.
 *
 * Features stay registered even when the matching `enable*` prop is off: with
 * no state to act on, each row model short-circuits to the model before it, so
 * this costs nothing beyond the import. */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  expandedRowModel: createExpandedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  /* The built-in registries are spread wholesale so `filterFn`/`sortFn` accept
   * the same names they did in v8 — including the `"auto"` sort path, which
   * looks up `datetime`/`alphanumeric`/`text` by name and silently degrades to
   * a basic comparator when they are missing. */
  filterFns: {
    ...builtInFilterFns,
    conditional: conditionalFilterFn,
    typed: typedFilterFn,
  },
  sortFns: builtInSortFns,
})
