/**
 * DataTable field registry — column-type driven filter and editor controls.
 *
 * A column declares `meta.type` (`string | int | number | boolean | enum |
 * multiEnum | date | dateRange | custom`) and DataTable renders the matching
 * ui-kit control in both the header filter row and the inline row editor, all
 * at `size={size}`. Anything non-standard uses the per-column escape hatches
 * `meta.renderFilter` / `meta.renderEditor`, or the table-wide
 * `filterRenderers` / `editorRenderers` overrides.
 *
 * The kit has no date-picker component yet, so date fields use the native
 * `Input type="date"` / `datetime-local`; swapping in a real picker later only
 * touches this file.
 */
import type { Column, Row } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { Input } from "../atoms/input"
import { NumericInput } from "../atoms/numeric-input"
import { Combobox } from "../molecules/combobox"
import { Select, type SelectItem } from "../molecules/select"
import { Switch } from "../molecules/switch"

export type DataTableColumnType =
  | "string"
  | "int"
  | "number"
  | "boolean"
  | "enum"
  | "multiEnum"
  | "date"
  | "datetime"
  | "time"
  | "dateRange"
  | "custom"

/** Control size scale shared by the table and every nested form control. */
export type DataTableControlSize = "sm" | "md" | "lg"

export type DataTableOption = { label: string; value: string }

/* ── Filter value shapes (per column type) ───────────────────────────────── */

export type TextFilterValue = { operator?: string; value?: string }
export type NumberFilterValue = {
  operator?: string
  value?: string
  to?: string
}
export type BooleanFilterValue = { value?: boolean }
export type EnumFilterValue = { values?: string[] }
export type DateRangeFilterValue = { from?: string; to?: string }

export type DataTableFilterValue =
  | TextFilterValue
  | NumberFilterValue
  | BooleanFilterValue
  | EnumFilterValue
  | DateRangeFilterValue

/* ── Render contexts (public — consumers implement these for custom types) ── */

export type DataTableFilterContext<T = unknown> = {
  column: Column<T, unknown>
  type: DataTableColumnType
  value: DataTableFilterValue | undefined
  setValue: (value: DataTableFilterValue | undefined) => void
  /** True while an inline edit locks the table's filter controls. */
  disabled: boolean
  size: DataTableControlSize
  options: DataTableOption[]
}

export type DataTableEditorContext<T = unknown> = {
  row: Row<T>
  column: Column<T, unknown>
  type: DataTableColumnType
  value: unknown
  setValue: (value: unknown) => void
  disabled: boolean
  size: DataTableControlSize
  options: DataTableOption[]
  /** Validation message for this field, if the last commit attempt failed. */
  error?: string
  /** Commit the whole row (e.g. on Enter). */
  commit: () => void
  /** Discard the row draft (e.g. on Escape). */
  cancel: () => void
}

export type DataTableFilterRenderer<T = unknown> = (
  ctx: DataTableFilterContext<T>
) => ReactNode
export type DataTableEditorRenderer<T = unknown> = (
  ctx: DataTableEditorContext<T>
) => ReactNode

/* ── Shared helpers ──────────────────────────────────────────────────────── */

const TEXT_OPS: DataTableOption[] = [
  { label: "Contains", value: "contains" },
  { label: "Equals", value: "equals" },
  { label: "Starts with", value: "startsWith" },
  { label: "Ends with", value: "endsWith" },
  { label: "Is empty", value: "empty" },
  { label: "Is not empty", value: "notEmpty" },
]

const NUMBER_OPS: DataTableOption[] = [
  { label: "=", value: "equals" },
  { label: "≠", value: "notEquals" },
  { label: ">", value: "gt" },
  { label: "≥", value: "gte" },
  { label: "<", value: "lt" },
  { label: "≤", value: "lte" },
  { label: "Between", value: "between" },
]

const BOOLEAN_FILTER_ITEMS: SelectItem[] = [
  { label: "All", value: "" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
]

const HHMM_RE = /^(\d{1,2}):(\d{2})/

const toSelectItems = (options: DataTableOption[]): SelectItem[] =>
  options.map((o) => ({ label: o.label, value: o.value }))

/** Single-value Select used for operators / enums / booleans. */
function FieldSelect({
  items,
  value,
  ariaLabel,
  placeholder,
  disabled,
  size,
  onChange,
}: {
  items: SelectItem[]
  value: string
  ariaLabel: string
  placeholder?: string
  disabled?: boolean
  size: DataTableControlSize
  onChange: (value: string) => void
}) {
  return (
    <Select
      aria-label={ariaLabel}
      disabled={disabled}
      items={items}
      onValueChange={(d) => onChange(d.value[0] ?? "")}
      size={size}
      value={[value]}
    >
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {items.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  )
}

/* ── Default FILTER renderers, keyed by column type ──────────────────────── */

export const DEFAULT_FILTER_RENDERERS: Record<
  DataTableColumnType,
  DataTableFilterRenderer
> = {
  string: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as TextFilterValue
    const operator = v.operator ?? "contains"
    const needsValue = operator !== "empty" && operator !== "notEmpty"
    return (
      <>
        <FieldSelect
          ariaLabel={`Filter operator for ${column.id}`}
          disabled={disabled}
          items={toSelectItems(TEXT_OPS)}
          onChange={(op) => setValue({ ...v, operator: op })}
          size={size}
          value={operator}
        />
        {needsValue && (
          <Input
            aria-label={`Filter value for ${column.id}`}
            disabled={disabled}
            onChange={(e) =>
              setValue({ ...v, operator, value: e.target.value })
            }
            placeholder="Value"
            size={size}
            value={v.value ?? ""}
          />
        )}
      </>
    )
  },

  int: (ctx) => DEFAULT_FILTER_RENDERERS.number(ctx),

  number: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as NumberFilterValue
    const operator = v.operator ?? "equals"
    return (
      <>
        <FieldSelect
          ariaLabel={`Filter operator for ${column.id}`}
          disabled={disabled}
          items={toSelectItems(NUMBER_OPS)}
          onChange={(op) => setValue({ ...v, operator: op })}
          size={size}
          value={operator}
        />
        <Input
          aria-label={`Filter value for ${column.id}`}
          disabled={disabled}
          onChange={(e) => setValue({ ...v, operator, value: e.target.value })}
          placeholder={operator === "between" ? "From" : "Value"}
          size={size}
          type="number"
          value={v.value ?? ""}
        />
        {operator === "between" && (
          <Input
            aria-label={`Filter upper bound for ${column.id}`}
            disabled={disabled}
            onChange={(e) => setValue({ ...v, operator, to: e.target.value })}
            placeholder="To"
            size={size}
            type="number"
            value={v.to ?? ""}
          />
        )}
      </>
    )
  },

  boolean: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as BooleanFilterValue
    const current = v.value === undefined ? "" : String(v.value)
    return (
      <FieldSelect
        ariaLabel={`Filter ${column.id}`}
        disabled={disabled}
        items={BOOLEAN_FILTER_ITEMS}
        onChange={(next) =>
          setValue(next === "" ? undefined : { value: next === "true" })
        }
        placeholder="All"
        size={size}
        value={current}
      />
    )
  },

  enum: ({ column, value, setValue, disabled, options, size }) => {
    const v = (value ?? {}) as EnumFilterValue
    const current = v.values?.[0] ?? ""
    return (
      <FieldSelect
        ariaLabel={`Filter ${column.id}`}
        disabled={disabled}
        items={[{ label: "All", value: "" }, ...toSelectItems(options)]}
        onChange={(next) => setValue(next ? { values: [next] } : undefined)}
        placeholder="All"
        size={size}
        value={current}
      />
    )
  },

  multiEnum: ({ column, value, setValue, disabled, options, size }) => {
    const v = (value ?? {}) as EnumFilterValue
    return (
      <Combobox
        disabled={disabled}
        items={options.map((o) => ({ label: o.label, value: o.value }))}
        multiple
        onChange={(next) => {
          const arr = Array.isArray(next) ? next : [next].filter(Boolean)
          setValue(arr.length ? { values: arr as string[] } : undefined)
        }}
        placeholder={`Filter ${column.id}`}
        size={size}
        value={v.values ?? []}
      />
    )
  },

  date: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as DateRangeFilterValue
    return (
      <Input
        aria-label={`Filter ${column.id}`}
        disabled={disabled}
        onChange={(e) =>
          setValue(
            e.target.value
              ? { from: e.target.value, to: e.target.value }
              : undefined
          )
        }
        size={size}
        type="date"
        value={v.from ?? ""}
      />
    )
  },

  datetime: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as DateRangeFilterValue
    return (
      <Input
        aria-label={`Filter ${column.id}`}
        disabled={disabled}
        onChange={(e) =>
          setValue(e.target.value ? { from: e.target.value } : undefined)
        }
        size={size}
        type="datetime-local"
        value={v.from ?? ""}
      />
    )
  },

  // Time-only: compared as minutes-since-midnight, so it filters a "start/end"
  // window independently of any date part.
  time: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as DateRangeFilterValue
    const patch = (next: DateRangeFilterValue) =>
      setValue(next.from || next.to ? next : undefined)
    return (
      <>
        <Input
          aria-label={`Filter ${column.id} from`}
          disabled={disabled}
          onChange={(e) => patch({ ...v, from: e.target.value })}
          size={size}
          type="time"
          value={v.from ?? ""}
        />
        <Input
          aria-label={`Filter ${column.id} to`}
          disabled={disabled}
          onChange={(e) => patch({ ...v, to: e.target.value })}
          size={size}
          type="time"
          value={v.to ?? ""}
        />
      </>
    )
  },

  dateRange: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as DateRangeFilterValue
    const patch = (next: DateRangeFilterValue) =>
      setValue(next.from || next.to ? next : undefined)
    return (
      <>
        <Input
          aria-label={`Filter ${column.id} from`}
          disabled={disabled}
          onChange={(e) => patch({ ...v, from: e.target.value })}
          size={size}
          type="date"
          value={v.from ?? ""}
        />
        <Input
          aria-label={`Filter ${column.id} to`}
          disabled={disabled}
          // Guard the classic from > to mistake at the control level.
          min={v.from || undefined}
          onChange={(e) => patch({ ...v, to: e.target.value })}
          size={size}
          type="date"
          value={v.to ?? ""}
        />
      </>
    )
  },

  // Non-standard columns must supply meta.renderFilter; rendering nothing keeps
  // the filter row aligned instead of guessing a control.
  custom: () => null,
}

/* ── Default EDITOR renderers, keyed by column type ──────────────────────── */

const editorKeyHandlers = (commit: () => void, cancel: () => void) => ({
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancel()
    }
  },
})

export const DEFAULT_EDITOR_RENDERERS: Record<
  DataTableColumnType,
  DataTableEditorRenderer
> = {
  string: ({
    column,
    value,
    setValue,
    disabled,
    error,
    commit,
    cancel,
    size,
  }) => (
    <Input
      aria-invalid={error ? true : undefined}
      aria-label={`Edit ${column.id}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      size={size}
      value={(value as string) ?? ""}
      {...editorKeyHandlers(commit, cancel)}
    />
  ),

  int: (ctx) => DEFAULT_EDITOR_RENDERERS.number(ctx),

  number: ({ column, value, setValue, disabled, commit, cancel, size }) => (
    <NumericInput
      aria-label={`Edit ${column.id}`}
      disabled={disabled}
      onChange={setValue}
      size={size}
      value={typeof value === "number" ? value : undefined}
      {...editorKeyHandlers(commit, cancel)}
    />
  ),

  boolean: ({ column, value, setValue, disabled, error }) => (
    <Switch
      checked={Boolean(value)}
      disabled={disabled}
      onCheckedChange={setValue}
      validateStatus={error ? "error" : "default"}
    >
      <span className="sr-only">{`Edit ${column.id}`}</span>
    </Switch>
  ),

  enum: ({ column, value, setValue, disabled, options, error, size }) => (
    <FieldSelect
      ariaLabel={`Edit ${column.id}`}
      disabled={disabled}
      items={toSelectItems(options)}
      onChange={setValue}
      placeholder={error ? "Required" : undefined}
      size={size}
      value={(value as string) ?? ""}
    />
  ),

  multiEnum: ({ column, value, setValue, disabled, options, error, size }) => (
    <Combobox
      disabled={disabled}
      items={options.map((o) => ({ label: o.label, value: o.value }))}
      multiple
      onChange={(next) => setValue(Array.isArray(next) ? next : [next])}
      placeholder={`Edit ${column.id}`}
      size={size}
      validateStatus={error ? "error" : "default"}
      value={(value as string[]) ?? []}
    />
  ),

  date: ({
    column,
    value,
    setValue,
    disabled,
    error,
    commit,
    cancel,
    size,
  }) => (
    <Input
      aria-invalid={error ? true : undefined}
      aria-label={`Edit ${column.id}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      size={size}
      type="date"
      value={(value as string) ?? ""}
      {...editorKeyHandlers(commit, cancel)}
    />
  ),

  datetime: ({
    column,
    value,
    setValue,
    disabled,
    error,
    commit,
    cancel,
    size,
  }) => (
    <Input
      aria-invalid={error ? true : undefined}
      aria-label={`Edit ${column.id}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      size={size}
      type="datetime-local"
      value={(value as string) ?? ""}
      {...editorKeyHandlers(commit, cancel)}
    />
  ),

  time: ({
    column,
    value,
    setValue,
    disabled,
    error,
    commit,
    cancel,
    size,
  }) => (
    <Input
      aria-invalid={error ? true : undefined}
      aria-label={`Edit ${column.id}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      size={size}
      type="time"
      value={(value as string) ?? ""}
      {...editorKeyHandlers(commit, cancel)}
    />
  ),

  dateRange: ({ column, value, setValue, disabled, commit, cancel, size }) => {
    const v = (value ?? {}) as { from?: string; to?: string }
    return (
      <>
        <Input
          aria-label={`Edit ${column.id} from`}
          disabled={disabled}
          onChange={(e) => setValue({ ...v, from: e.target.value })}
          size={size}
          type="date"
          value={v.from ?? ""}
          {...editorKeyHandlers(commit, cancel)}
        />
        <Input
          aria-label={`Edit ${column.id} to`}
          disabled={disabled}
          min={v.from || undefined}
          onChange={(e) => setValue({ ...v, to: e.target.value })}
          size={size}
          type="date"
          value={v.to ?? ""}
          {...editorKeyHandlers(commit, cancel)}
        />
      </>
    )
  },

  custom: () => null,
}

/* ── Type-aware filter function ──────────────────────────────────────────── */

const isBlank = (v: unknown) => v == null || v === ""

function matchText(cell: unknown, f: TextFilterValue) {
  const operator = f.operator ?? "contains"
  if (operator === "empty") {
    return isBlank(cell)
  }
  if (operator === "notEmpty") {
    return !isBlank(cell)
  }
  if (isBlank(f.value)) {
    return true
  }
  const text = String(cell ?? "").toLowerCase()
  const q = String(f.value).toLowerCase()
  switch (operator) {
    case "equals":
      return text === q
    case "startsWith":
      return text.startsWith(q)
    case "endsWith":
      return text.endsWith(q)
    default:
      return text.includes(q)
  }
}

function matchNumber(cell: unknown, f: NumberFilterValue) {
  const operator = f.operator ?? "equals"
  const n = Number(cell)
  if (operator === "between") {
    const lo = Number(f.value)
    const hi = Number(f.to)
    if (!(isBlank(f.value) || Number.isNaN(lo)) && n < lo) {
      return false
    }
    if (!(isBlank(f.to) || Number.isNaN(hi)) && n > hi) {
      return false
    }
    return true
  }
  if (isBlank(f.value)) {
    return true
  }
  const target = Number(f.value)
  switch (operator) {
    case "notEquals":
      return n !== target
    case "gt":
      return n > target
    case "gte":
      return n >= target
    case "lt":
      return n < target
    case "lte":
      return n <= target
    default:
      return n === target
  }
}

const END_OF_DAY_MS = 24 * 60 * 60 * 1000 - 1
const time = (v: unknown) => {
  const t = new Date(String(v)).getTime()
  return Number.isNaN(t) ? undefined : t
}

/** True when the cell's own {from,to} interval overlaps the filter interval. */
function matchRangeOverlap(
  cell: { from?: unknown; to?: unknown },
  f: DateRangeFilterValue
) {
  const cellFrom = time(cell.from) ?? Number.NEGATIVE_INFINITY
  const cellTo =
    (time(cell.to) ?? Number.POSITIVE_INFINITY) + (cell.to ? END_OF_DAY_MS : 0)
  const filterFrom = f.from
    ? (time(f.from) ?? Number.NEGATIVE_INFINITY)
    : Number.NEGATIVE_INFINITY
  const filterTo = f.to
    ? (time(f.to) ?? Number.POSITIVE_INFINITY) + END_OF_DAY_MS
    : Number.POSITIVE_INFINITY
  return cellFrom <= filterTo && cellTo >= filterFrom
}

function matchDateRange(cell: unknown, f: DateRangeFilterValue) {
  if (isBlank(cell)) {
    return false
  }
  // A dateRange column stores {from,to} per cell — compare interval overlap.
  if (typeof cell === "object" && ("from" in cell || "to" in cell)) {
    return matchRangeOverlap(cell as { from?: unknown; to?: unknown }, f)
  }
  const t = new Date(String(cell)).getTime()
  if (Number.isNaN(t)) {
    return false
  }
  if (f.from) {
    const from = new Date(f.from).getTime()
    if (!Number.isNaN(from) && t < from) {
      return false
    }
  }
  if (f.to) {
    // Inclusive end-of-day so a single-day range matches that whole day.
    const to = new Date(f.to).getTime() + 24 * 60 * 60 * 1000 - 1
    if (!Number.isNaN(to) && t > to) {
      return false
    }
  }
  return true
}

/** Minutes since midnight from "HH:mm", an ISO datetime, or a Date. */
function toMinutes(value: unknown): number | undefined {
  if (isBlank(value)) {
    return
  }
  const s = String(value)
  const hhmm = s.match(HHMM_RE)
  if (hhmm) {
    return Number(hhmm[1]) * 60 + Number(hhmm[2])
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime())
    ? undefined
    : d.getHours() * 60 + d.getMinutes()
}

function matchTime(cell: unknown, f: DateRangeFilterValue) {
  const t = toMinutes(cell)
  if (t === undefined) {
    return false
  }
  const from = toMinutes(f.from)
  const to = toMinutes(f.to)
  // An inverted window (22:00 → 06:00) is read as crossing midnight.
  if (from !== undefined && to !== undefined && from > to) {
    return t >= from || t <= to
  }
  if (from !== undefined && t < from) {
    return false
  }
  if (to !== undefined && t > to) {
    return false
  }
  return true
}

/**
 * Filter function that dispatches on the column's declared `meta.type`.
 * Register with `filterFn: "typed"` (DataTable registers it by default).
 */
export function typedFilterMatch(
  type: DataTableColumnType,
  cell: unknown,
  filterValue: DataTableFilterValue
): boolean {
  if (filterValue == null) {
    return true
  }
  switch (type) {
    case "boolean": {
      const f = filterValue as BooleanFilterValue
      return f.value === undefined ? true : Boolean(cell) === f.value
    }
    case "enum": {
      const f = filterValue as EnumFilterValue
      return f.values?.length ? f.values.includes(String(cell)) : true
    }
    case "multiEnum": {
      const f = filterValue as EnumFilterValue
      if (!f.values?.length) {
        return true
      }
      const arr = Array.isArray(cell) ? cell.map(String) : [String(cell)]
      return f.values.some((v) => arr.includes(v))
    }
    case "int":
    case "number":
      return matchNumber(cell, filterValue as NumberFilterValue)
    case "time":
      return matchTime(cell, filterValue as DateRangeFilterValue)
    case "date":
    case "datetime":
    case "dateRange":
      return matchDateRange(cell, filterValue as DateRangeFilterValue)
    default:
      return matchText(cell, filterValue as TextFilterValue)
  }
}
