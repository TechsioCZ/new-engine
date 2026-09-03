/**
 * DataTable helpers — types, conditional filter operators and pin styling.
 *
 * Kept separate from `data-table.tsx` so the component file stays focused on
 * rendering. Re-exported through `data-table.tsx` for consumers.
 */
import {
  type CellData,
  type ColumnSizingState,
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
  filterFn_includesString,
  globalFilteringFeature,
  type ReactTable,
  type RowData,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
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
  DataTableFilterValue,
  DataTableOption,
} from "./data-table.fields"
import { isBlank, matchBetween, typedFilterMatch } from "./data-table.fields"

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
declare module "@tanstack/react-table" {
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
 * `meta.filterVariant` is deprecated in favour of `meta.type`, kept only so
 * existing columns keep filtering correctly. `"range"` predates `meta.type`
 * entirely and has no direct equivalent; it always meant the number filter,
 * which is range-capable via its `"between"` operator.
 */
const FILTER_VARIANT_TYPE: Record<
  "text" | "number" | "range" | "select",
  DataTableColumnType
> = {
  text: "string",
  number: "number",
  range: "number",
  select: "enum",
}

/**
 * The single source of truth for "what type is this column", shared by the
 * filter-row control that renders `meta.type` (or its deprecated
 * `filterVariant` alias) and the `typed` filter function that matches
 * against it. The two resolving `type` independently — as they briefly did —
 * is how a `filterVariant`-only column ends up with a number control writing
 * `{ operator: "gt", value, to }` while the matcher still treats it as
 * `"string"` and reads that object through `matchText`.
 */
export function resolveColumnType(meta?: {
  type?: DataTableColumnType
  filterVariant?: "text" | "number" | "range" | "select"
}): DataTableColumnType {
  return (
    meta?.type ??
    (meta?.filterVariant && FILTER_VARIANT_TYPE[meta.filterVariant]) ??
    "string"
  )
}

/**
 * Filter function that dispatches on the column's declared `meta.type`, so a
 * `boolean`/`enum`/`date` column filters correctly without the consumer wiring
 * a comparator. `applyColumnDefaults` puts this on every column that does not
 * name its own `filterFn`.
 */
/**
 * `autoRemove` for DataTable's own filter functions: true when a stored
 * filter value carries no actual constraint, so TanStack drops it from
 * `columnFilters` instead of leaving a phantom entry behind.
 *
 * Every built-in filterFn defines this; without it TanStack only removes
 * bare empty strings (see `shouldAutoRemoveFilter` in table-core). Our
 * controls always store an *object* (`{ operator, value }` and friends), so
 * clearing a filter left the entry in place — which reads as "a filter is
 * active" to anything counting `columnFilters.length`, notably the
 * row-reorder guard, which then stays disabled for the rest of the session.
 *
 * A *deliberately chosen* operator is itself state worth keeping, though:
 * picking "Starts with" (or "Between") before typing anything stores
 * `{ operator }` with no value, and dropping that would snap the condition
 * menu back to the type's default — so "Between" would never get the chance
 * to reveal its second input. Only a value-less filter still sitting on its
 * default operator counts as empty.
 */
function filterValueIsEmpty(value: unknown, column?: unknown): boolean {
  if (value == null) {
    return true
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value !== "object") {
    return isBlank(value)
  }
  const v = value as {
    operator?: string
    value?: unknown
    to?: unknown
    from?: unknown
    values?: unknown[]
  }
  // These two constrain the cell rather than compare against a typed value,
  // so they are real filters despite carrying nothing to compare.
  if (v.operator === "empty" || v.operator === "notEmpty") {
    return false
  }
  if (Array.isArray(v.values)) {
    return v.values.length === 0
  }
  // `false` is a genuine boolean constraint, so only `undefined` counts as
  // "nothing selected" for the boolean filter's `{ value }` shape.
  if (typeof v.value === "boolean") {
    return false
  }
  if (!(isBlank(v.value) && isBlank(v.to) && isBlank(v.from))) {
    return false
  }
  if (v.operator === undefined) {
    return true
  }
  // Value-less: keep it only when the operator is a non-default pick the
  // user made on purpose. The defaults mirror the two filter renderers'
  // own fallbacks in data-table.fields.tsx.
  const meta = (
    column as { columnDef?: { meta?: Parameters<typeof resolveColumnType>[0] } }
  )?.columnDef?.meta
  const type = resolveColumnType(meta)
  // Mirrors which matcher `typedFilterMatch` routes each type to: `number`,
  // `int` and `custom` all land on `matchNumber` (default `"equals"`),
  // everything else on `matchText` (default `"contains"`). Getting `custom`
  // wrong here left `{ operator: "equals" }` un-removed on those columns —
  // the exact phantom-filter case this function exists to prevent.
  const defaultOperator =
    type === "number" || type === "int" || type === "custom"
      ? "equals"
      : "contains"
  return v.operator === defaultOperator
}

export const typedFilterFn: AnyFilterFn = (row, columnId, filterValue) => {
  // `table.getColumn` is a memoised id lookup. Reading the type off the row's
  // cells instead would rescan every leaf column for every row of every
  // filtered column.
  const type = resolveColumnType(row.table.getColumn(columnId)?.columnDef.meta)
  return typedFilterMatch(type, row.getValue(columnId), filterValue)
}
typedFilterFn.autoRemove = filterValueIsEmpty

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

/* The canonical operator lists and `isBlank` live in `data-table.fields.tsx`,
 * next to the controls and matchers that consume them. This file used to carry
 * a second copy of both lists; the two drifted, and the filter row ended up
 * offering operators the typed matcher silently mishandled. */

/**
 * The `between` arm of `evaluateCondition`, delegating to `matchBetween`
 * (data-table.fields.tsx) so the typed and conditional filters can't
 * silently diverge on the same numeric column's between behavior.
 */
function evaluateBetween(
  num: number,
  cellHasNoNumber: boolean,
  value: unknown,
  to: unknown
): boolean {
  return matchBetween(num, cellHasNoNumber, {
    value: value as string | undefined,
    to: to as string | undefined,
  })
}

/**
 * Guard shared by every numeric operator (`gt`/`gte`/`lt`/`lte`, plus
 * `equals`/`notEquals` on a numeric column): a half-typed value ("-", "1e",
 * ".") parses to NaN and would otherwise empty the table mid-keystroke, so
 * treat it as "no constraint yet" — matching how `between` already guards
 * its bounds. A blank/non-numeric cell never satisfies a numeric constraint.
 * Returns the verdict to short-circuit on, or `undefined` to keep evaluating.
 */
function guardNumericOperator(
  operator: DataTableFilterOperator,
  isNumericColumn: boolean,
  target: number,
  cellHasNoNumber: boolean
): boolean | undefined {
  const numericOperator =
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte" ||
    (isNumericColumn && (operator === "equals" || operator === "notEquals"))
  if (!numericOperator) {
    return
  }
  if (Number.isNaN(target)) {
    return true
  }
  if (cellHasNoNumber) {
    // Mirrors `matchNumber`: a blank cell fails every positive comparison but
    // satisfies a negative one — it is trivially "not 5" — so `≠` must keep
    // it, exactly as the text matcher's `notContains` does.
    return operator === "notEquals"
  }
  return
}

function evaluateCondition(
  cellValue: unknown,
  { operator, value, to }: DataTableConditionalFilterValue,
  isNumericColumn: boolean
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
  // `Number(null)` and `Number("")` are both 0, not NaN, so a blank cell
  // would otherwise satisfy `lt 5`, `gte 0` and the like — the same hole
  // `matchNumber` (data-table.fields.tsx) already guards against for the
  // typed filter, mirrored here for the conditional one.
  const cellHasNoNumber = isBlank(cellValue) || Number.isNaN(num)

  const numericGuard = guardNumericOperator(
    operator,
    isNumericColumn,
    target,
    cellHasNoNumber
  )
  if (numericGuard !== undefined) {
    return numericGuard
  }

  switch (operator) {
    case "contains":
      return text.includes(query)
    case "notContains":
      return !text.includes(query)
    case "equals":
      // NUMBER_FILTER_OPERATORS offers "=" on numeric columns; comparing as
      // strings there would fail "07" vs 7 even though gt/gte/lt/lte on the
      // same column already compare numerically.
      return isNumericColumn ? num === target : text === query
    case "notEquals":
      return isNumericColumn ? num !== target : text !== query
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
    case "between":
      return evaluateBetween(num, cellHasNoNumber, value, to)
    default:
      return true
  }
}

/**
 * TanStack `filterFn` implementing operator-based ("with conditions") column
 * filtering. Register on a column via `filterFn: conditionalFilterFn` and store
 * `{ operator, value, to? }` as the filter value.
 *
 * The operator set (contains/equals/startsWith/gt/between/…) only has
 * meaning for `"string"`/`"number"`/`"int"` columns. The `enum`, `multiEnum`,
 * `boolean` and date/time controls never write an `operator` at all — they
 * store `{ values }`, `{ value }` or `{ from, to }` — so an operator-less
 * value is handed to the typed matcher rather than treated as "no filter".
 * Returning `true` for those (as this used to) made any such column opting
 * into `"conditional"` match every row while `autoRemove` kept the entry, so
 * the UI and `onColumnFiltersChange` both reported an active filter that did
 * nothing.
 */
export const conditionalFilterFn: AnyFilterFn = (
  row,
  columnId,
  filterValue: DataTableConditionalFilterValue
) => {
  if (filterValue == null) {
    return true
  }
  const type = resolveColumnType(row.table.getColumn(columnId)?.columnDef.meta)
  if (!filterValue.operator) {
    // Operator-less: this is one of the non-operator shapes (`{ values }`,
    // `{ value }`, `{ from, to }`) that the enum/boolean/date controls write.
    return typedFilterMatch(
      type,
      row.getValue(columnId),
      filterValue as DataTableFilterValue
    )
  }
  // "int" is numeric everywhere else (`typedFilterMatch` routes both "number"
  // and "int" to `matchNumber`) — matching only "number" here would give an
  // int column string-compared "="/"≠" while every other operator on it
  // (and every operator on a "number" column) compares numerically.
  return evaluateCondition(
    row.getValue(columnId),
    filterValue,
    type === "number" || type === "int"
  )
}
conditionalFilterFn.autoRemove = filterValueIsEmpty

/* ── Column widths ────────────────────────────────────────────────────────
 * TanStack tracks a numeric `size` used by the resizing feature. Columns that
 * are only ever declaratively sized need `%`, `ch` and token values too, hence
 * the wider `meta.width` shape sitting alongside it. */

/** A column width: a number (px) or any CSS length, including `var(--token)`. */
export type DataTableColumnWidth = number | string

const toCssLength = (value: DataTableColumnWidth | undefined) =>
  typeof value === "number" ? `${value}px` : value

/**
 * Fills in the column defaults DataTable's own controls depend on.
 *
 * **`filterFn`.** Every column in the filter row renders one of the typed
 * controls — `meta.type` defaults to `"string"`, so this is true even for a
 * column that declares no type at all — and those controls write an
 * `{ operator, value }` object. TanStack's default `auto` comparator has no
 * idea what to do with that object and matches nothing, so a column that
 * forgot `filterFn: "typed"` silently emptied the table the moment anyone
 * filtered it. Defaulting it here is what the docs always claimed happened.
 * An explicit `filterFn`, string or function, always wins.
 *
 * **Sizes.** Mirrors numeric `meta.width` / `meta.minWidth` / `meta.maxWidth`
 * into TanStack's own `size` / `minSize` / `maxSize`.
 *
 * Without this the two disagree: sticky offsets for pinned columns come from
 * `column.getStart()`, which sums `getSize()`, so a frozen column rendered at
 * `meta.width: 80` would push its neighbour by TanStack's default 150 and the
 * frozen block would be misaligned. Resizing would drift the same way.
 *
 * CSS-string widths (`"15%"`, `"var(--dimension-120)"`) cannot be resolved to
 * pixels here, so they stay CSS-only — see `getColumnSizeStyles`.
 */
export function applyColumnDefaults<T extends RowData>(
  columns: ColumnDef<T, unknown>[]
): ColumnDef<T, unknown>[] {
  return columns.map((column) => {
    const group = column as { columns?: ColumnDef<T, unknown>[] }
    const next: ColumnDef<T, unknown> = group.columns
      ? ({
          ...column,
          columns: applyColumnDefaults(group.columns),
        } as ColumnDef<T, unknown>)
      : { ...column }

    if (next.filterFn === undefined) {
      next.filterFn = "typed"
    }

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
 * mirrored into `size` by `applyColumnDefaults`, so `getSize()` is the
 * authority for them and the rendered width always matches the sticky offsets.
 *
 * A CSS-string width (`"15%"`, `"var(--dimension-120)"`) has no pixel value to
 * mirror, so it stays CSS-only — including while resizing is enabled, where
 * `getSize()` would otherwise report the 150px default and collapse the
 * declared width the moment the feature is switched on. Once the user actually
 * drags such a column its id appears in `columnSizing` and the dragged size
 * takes over; `resetSize()` drops the entry and the declared width returns.
 */
export function getColumnSizeStyles<T extends RowData>(
  column: Column<T>,
  enableColumnResizing?: boolean,
  columnSizing?: ColumnSizingState
): CSSProperties {
  const meta = column.columnDef.meta
  const declared = meta?.width
  const wasResized =
    enableColumnResizing === true &&
    columnSizing !== undefined &&
    Object.hasOwn(columnSizing, column.id)
  const fromTanstack = wasResized || typeof declared === "number"

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
  /**
   * The sticky actions cell sits one level above pinned body cells. Both
   * freeze at the trailing edge (`getAfter("end")` is 0 for the last
   * end-pinned column, and the actions cell is `end-0`), and the actions
   * column is not part of TanStack's column model so `getAfter` cannot
   * account for its width. At equal z-index the winner came down to DOM
   * order; this at least makes the actions cell deterministically on top.
   * The overlap itself is a known limitation — see the dev warning in
   * DataTable for the `enableColumnPinning` + `stickyActions` combination.
   */
  stickyActionsCell: 2,
  /**
   * Any sticky header-area cell that is not pinned — notably the filter row,
   * whose `<td>`s are raw elements and so never pick up the `sticky top-0
   * z-10` the `Table` organism puts on real header cells. Without a level of
   * their own they sat at `z-index: auto` while pinned *body* cells carry
   * `pinnedCell`, so scrolling painted a frozen column straight over the
   * sticky filter row. Above every body level, below the pinned header ones.
   */
  stickyHeaderCell: 10,
  pinnedHeaderCell: 20,
  stickyActionsHeaderCell: 21,
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
    // Logical, not physical: v9 pins to `start`/`end` rather than left/right, so
    // in an RTL table a start-pinned column has to freeze against the right
    // edge. `insetInline*` is what the TanStack migration guide recommends for
    // exactly this, and it matches the logical Tailwind utilities the rest of
    // the library uses.
    insetInlineStart:
      pinned === "start" ? `${column.getStart("start")}px` : undefined,
    insetInlineEnd:
      pinned === "end" ? `${column.getAfter("end")}px` : undefined,
    zIndex:
      kind === "header"
        ? DATA_TABLE_Z.pinnedHeaderCell
        : DATA_TABLE_Z.pinnedCell,
  }
}

/** True when this column is the last of the start-pinned group (edge shadow). */
export function isLastStartPinned<T extends RowData>(
  column: Column<T>
): boolean {
  return (
    column.getIsPinned() === "start" && column.getIsLastColumn("start") === true
  )
}

/** True when this column is the first of the end-pinned group (edge shadow). */
export function isFirstEndPinned<T extends RowData>(
  column: Column<T>
): boolean {
  return (
    column.getIsPinned() === "end" && column.getIsFirstColumn("end") === true
  )
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
  /* Registered individually rather than by spreading the `filterFns`/`sortFns`
   * registries: those exports are deprecated in v9 precisely because spreading
   * them pins every built-in into the bundle, and this library ships unbundled
   * so the reference would survive the consumer's tree-shake.
   *
   * `includesString` backs the toolbar's global filter. `conditional` and
   * `typed` are DataTable's own; a column wanting some other comparator passes
   * the function itself, which needs no registration. */
  filterFns: {
    conditional: conditionalFilterFn,
    includesString: filterFn_includesString,
    typed: typedFilterFn,
  },
  /* These three names are not decorative: `sortFn: "auto"` samples the first
   * rows and looks up `datetime`, `alphanumeric` or `text` by name, falling
   * back to a basic comparator (and warning in dev) when one is missing. */
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
})
