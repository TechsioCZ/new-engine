/**
 * DataTable helpers — types, conditional filter operators and pin styling.
 *
 * Kept separate from `data-table.tsx` so the component file stays focused on
 * rendering. Re-exported through `data-table.tsx` for consumers.
 */
import type {
  Cell,
  Column,
  FilterFn,
  Row,
  RowData,
  Table as TanstackTable,
} from "@tanstack/react-table"
import type { CSSProperties } from "react"

/* ── Column meta augmentation ─────────────────────────────────────────────
 * Lets a column declare how it filters, aligns and edits without leaking
 * DataTable concerns into every consumer's ColumnDef. */
declare module "@tanstack/react-table" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires interface
  // biome-ignore lint/correctness/noUnusedVariables: augmentation signature must match upstream generics
  interface ColumnMeta<TData, TValue> {
    /** Right-align header + cells (numeric columns). */
    align?: "start" | "end"
    /** Which filter control the default header filter renders. */
    filterVariant?: "text" | "number" | "range" | "select"
    /** Options for `filterVariant: "select"`. */
    filterOptions?: { label: string; value: string }[]
    /** Enable inline editing for this column's cells. */
    editable?: boolean
    /** Which editor the inline edit renders. */
    editVariant?: "text" | "number" | "select"
    /** Options for `editVariant: "select"`. */
    editOptions?: { label: string; value: string }[]
  }

  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires interface
  // biome-ignore lint/correctness/noUnusedVariables: augmentation signature must match upstream generics
  interface TableMeta<TData extends RowData> {
    /** Commit an inline cell edit; wired by DataTable to `onCellEditCommit`. */
    updateData?: (rowId: string, columnId: string, value: unknown) => void
  }

  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires interface
  interface FilterFns {
    /** Operator-based ("with conditions") column filter registered by DataTable. */
    conditional: FilterFn<unknown>
  }
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
export const conditionalFilterFn: FilterFn<unknown> = (
  row,
  columnId,
  filterValue: DataTableConditionalFilterValue
) => {
  if (!filterValue?.operator) {
    return true
  }
  return evaluateCondition(row.getValue(columnId), filterValue)
}

/* ── Column pinning (freeze) styling ─────────────────────────────────────── */

/**
 * Sticky-positioning styles for a pinned (frozen) column. Applied inline
 * because the offsets are data-driven (`getStart`/`getAfter`). The visual
 * treatment (shadow at the frozen edge) is done via `data-pinned` + tokens.
 */
export function getPinningStyles<T>(column: Column<T>): CSSProperties {
  const pinned = column.getIsPinned()
  if (!pinned) {
    return {}
  }
  return {
    position: "sticky",
    left: pinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: pinned === "right" ? `${column.getAfter("right")}px` : undefined,
    zIndex: 1,
  }
}

/** True when this column is the last of the left-pinned group (edge shadow). */
export function isLastLeftPinned<T>(column: Column<T>): boolean {
  return (
    column.getIsPinned() === "left" && column.getIsLastColumn("left") === true
  )
}

/** True when this column is the first of the right-pinned group (edge shadow). */
export function isFirstRightPinned<T>(column: Column<T>): boolean {
  return (
    column.getIsPinned() === "right" &&
    column.getIsFirstColumn("right") === true
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

export type DataTableGetCellSpan<T> = (
  cell: Cell<T, unknown>,
  context: { row: Row<T>; rows: Row<T>[]; rowIndex: number }
) => DataTableCellSpan | undefined

/* Convenience re-export so consumers can type the instance from one import. */
export type DataTableInstance<T> = TanstackTable<T>
