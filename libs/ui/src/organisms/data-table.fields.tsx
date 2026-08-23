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
import type { RowData } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { ActionIcon } from "../atoms/action-icon"
import { Input } from "../atoms/input"
import { NumericInput } from "../atoms/numeric-input"
import { Combobox } from "../molecules/combobox"
import { Menu } from "../molecules/menu"
import { Select, type SelectItem } from "../molecules/select"
import { Switch } from "../molecules/switch"
import type { Column, DataTableFilterOperator, Row } from "./data-table.helpers"

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

export type DataTableFilterContext<T extends RowData = RowData> = {
  column: Column<T, unknown>
  /** Localised operator labels, keyed by operator. */
  operatorLabels?: Partial<Record<string, string>>
  type: DataTableColumnType
  value: DataTableFilterValue | undefined
  setValue: (value: DataTableFilterValue | undefined) => void
  /** True while an inline edit locks the table's filter controls. */
  disabled: boolean
  size: DataTableControlSize
  options: DataTableOption[]
}

export type DataTableEditorContext<T extends RowData = RowData> = {
  row: Row<T>
  /** Id of the element rendering `error`, for `aria-describedby`. */
  errorId?: string
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

export type DataTableFilterRenderer<T extends RowData = RowData> = (
  ctx: DataTableFilterContext<T>
) => ReactNode
export type DataTableEditorRenderer<T extends RowData = RowData> = (
  ctx: DataTableEditorContext<T>
) => ReactNode

/* ── Shared helpers ──────────────────────────────────────────────────────── */

/** Treats `null`, `undefined` and `""` alike — shared with the conditional filter. */
export const isBlank = (v: unknown) => v == null || v === ""

/**
 * The operators a text column offers, in menu order. This is the single list:
 * the typed filter row renders it, the conditional (operator-based) filter
 * imports it through `data-table.helpers`, and `matchText` below handles every
 * entry. Adding one here without a branch in `matchText` makes that operator
 * fall through to "contains".
 */
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

/** Same contract as `TEXT_FILTER_OPERATORS`, for numeric columns. */
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

const TEXT_OPS: DataTableOption[] = TEXT_FILTER_OPERATORS
const NUMBER_OPS: DataTableOption[] = NUMBER_FILTER_OPERATORS

const BOOLEAN_FILTER_ITEMS: SelectItem[] = [
  { label: "All", value: "" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
]

const HHMM_RE = /^(\d{1,2}):(\d{2})/

const toSelectItems = (options: DataTableOption[]): SelectItem[] =>
  options.map((o) => ({ label: o.label, value: o.value }))

/** Human-readable column name for generated aria-labels: string header, else id. */
export function columnLabel<T extends RowData>(column: Column<T, unknown>) {
  const header = column.columnDef.header
  return typeof header === "string" && header ? header : column.id
}

/** Single-value Select used for operators / enums / booleans. */
/**
 * The single-value `Select` every DataTable control uses — filter dropdowns,
 * the inline editor and the footer's page-size picker. `value: undefined`
 * leaves it uncontrolled; `invalid` is what the editor uses to show a failed
 * field.
 */
/**
 * `Select`'s trigger sizes to its selected label, so a filter or editor whose
 * value changes shape between options (`"All"` vs. `"Administrator"`) resizes
 * its own table cell on every change — which reflows the column, and with it
 * the whole table.
 *
 * `ch` is defined as the width of the font's `"0"` glyph, not an average
 * character — proportional fonts render `"W"` two to three times wider than
 * `"i"`, so a same-length label can legitimately need more room than the
 * `ch` count alone predicts. Measured against this control's own font
 * (`Admin`/`Editor`/`Viewer` at the `sm` size), the actual chrome — icon,
 * gaps, padding, border — plus that per-glyph variance came out to roughly
 * double a naive "length + a little slack" estimate; `+ 7` is that margin
 * with headroom, not `+ 4`.
 */
function selectMinWidthCh(items: SelectItem[], placeholder?: string): string {
  const longest = items.reduce(
    (max, item) => Math.max(max, String(item.label ?? item.value).length),
    placeholder?.length ?? 0
  )
  return `${longest + 7}ch`
}

export function FieldSelect({
  items,
  value,
  ariaLabel,
  placeholder,
  disabled,
  size = "sm",
  invalid,
  onChange,
}: {
  items: SelectItem[]
  value?: string
  ariaLabel?: string
  placeholder?: string
  disabled?: boolean
  size?: DataTableControlSize
  invalid?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div style={{ minWidth: selectMinWidthCh(items, placeholder) }}>
      <Select
        disabled={disabled}
        items={items}
        onValueChange={(d) => onChange(d.value[0] ?? "")}
        size={size}
        validateStatus={invalid ? "error" : "default"}
        value={value === undefined ? undefined : [value]}
      >
        <Select.Control>
          {/*
           * The name goes on the trigger, not on `Select`: the root
           * destructures a closed prop list with no rest spread, so an
           * `aria-label` there is silently dropped (hyphenated JSX
           * attributes skip TS excess-property checks, so nothing flags
           * it). `Select.Trigger` spreads rest props onto the focusable
           * button, which is what assistive tech actually reads.
           */}
          <Select.Trigger aria-label={ariaLabel}>
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
    </div>
  )
}

/**
 * Operator picker for the filter row. An icon button rather than a full Select,
 * so the value control gets the width and the header stays compact.
 */
function FilterConditionMenu({
  operators,
  operatorLabels,
  value,
  onChange,
  disabled,
  size,
  columnName,
}: {
  operators: DataTableOption[]
  operatorLabels?: Partial<Record<string, string>>
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  size: DataTableControlSize
  columnName: string
}) {
  const labelled = operators.map((o) => ({
    ...o,
    label: operatorLabels?.[o.value] ?? o.label,
  }))
  const active = labelled.find((o) => o.value === value)
  return (
    <Menu
      aria-label={`Filter condition for ${columnName}`}
      customTrigger={
        <ActionIcon
          aria-label={`Filter condition for ${columnName}: ${active?.label ?? value}`}
          disabled={disabled}
          icon="icon-[mdi--filter-variant]"
          size={size}
          tone="neutral"
        />
      }
      items={labelled.map((o) => ({
        type: "radio" as const,
        value: o.value,
        label: o.label,
        name: `filter-operator-${columnName}`,
        checked: o.value === value,
      }))}
      onSelect={(d) => onChange(d.value)}
      size={size}
    />
  )
}

/* ── Default FILTER renderers, keyed by column type ──────────────────────── */

export const DEFAULT_FILTER_RENDERERS: Record<
  DataTableColumnType,
  DataTableFilterRenderer
> = {
  string: ({ column, value, setValue, disabled, size, operatorLabels }) => {
    const v = (value ?? {}) as TextFilterValue
    const operator = v.operator ?? "contains"
    const activeLabel =
      operatorLabels?.[operator] ??
      TEXT_OPS.find((o) => o.value === operator)?.label
    const needsValue = operator !== "empty" && operator !== "notEmpty"
    return (
      <>
        <Input
          aria-label={`Filter value for ${columnLabel(column)}`}
          className="flex-1"
          disabled={disabled || !needsValue}
          onChange={(e) => setValue({ ...v, operator, value: e.target.value })}
          placeholder={needsValue ? "Value" : activeLabel}
          size={size}
          value={needsValue ? (v.value ?? "") : ""}
        />
        <FilterConditionMenu
          columnName={columnLabel(column)}
          disabled={disabled}
          onChange={(op) => setValue({ ...v, operator: op })}
          operatorLabels={operatorLabels}
          operators={TEXT_OPS}
          size={size}
          value={operator}
        />
      </>
    )
  },

  int: (ctx) => DEFAULT_FILTER_RENDERERS.number(ctx),

  number: ({ column, value, setValue, disabled, size, operatorLabels }) => {
    const v = (value ?? {}) as NumberFilterValue
    const operator = v.operator ?? "equals"
    /* `empty` / `notEmpty` test the cell, not a typed number. Leaving the input
     * live would show a constraint that `matchNumber` ignores — the string
     * filter has always gated it this way. */
    const needsValue = operator !== "empty" && operator !== "notEmpty"
    const activeLabel =
      operatorLabels?.[operator] ??
      NUMBER_FILTER_OPERATORS.find((o) => o.value === operator)?.label
    let valuePlaceholder = activeLabel
    if (needsValue) {
      valuePlaceholder = operator === "between" ? "From" : "Value"
    }
    return (
      <>
        <Input
          aria-label={`Filter value for ${columnLabel(column)}`}
          className="flex-1"
          disabled={disabled || !needsValue}
          onChange={(e) => setValue({ ...v, operator, value: e.target.value })}
          placeholder={valuePlaceholder}
          size={size}
          type={needsValue ? "number" : "text"}
          value={needsValue ? (v.value ?? "") : ""}
        />
        {operator === "between" && (
          <Input
            aria-label={`Filter upper bound for ${columnLabel(column)}`}
            className="flex-1"
            disabled={disabled}
            onChange={(e) => setValue({ ...v, operator, to: e.target.value })}
            placeholder="To"
            size={size}
            type="number"
            value={v.to ?? ""}
          />
        )}
        <FilterConditionMenu
          columnName={columnLabel(column)}
          disabled={disabled}
          // Leaving `between` drops the upper bound: `matchNumber` ignores it
          // for every other operator, so keeping it would only resurface a
          // stale "To" value if the user came back to `between`.
          onChange={(op) =>
            setValue(
              op === "between"
                ? { ...v, operator: op }
                : { operator: op, value: v.value }
            )
          }
          operatorLabels={operatorLabels}
          operators={NUMBER_OPS}
          size={size}
          value={operator}
        />
      </>
    )
  },

  boolean: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as BooleanFilterValue
    const current = v.value === undefined ? "" : String(v.value)
    return (
      <FieldSelect
        ariaLabel={`Filter ${columnLabel(column)}`}
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
        ariaLabel={`Filter ${columnLabel(column)}`}
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
        placeholder={`Filter ${columnLabel(column)}`}
        size={size}
        value={v.values ?? []}
      />
    )
  },

  date: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as DateRangeFilterValue
    return (
      <Input
        aria-label={`Filter ${columnLabel(column)}`}
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

  // Sets only `from`, so a single picked instant filters "at or after" rather
  // than an exact match — a datetime-local value has minute precision while the
  // cell usually carries seconds, and an equality filter would match nothing.
  datetime: ({ column, value, setValue, disabled, size }) => {
    const v = (value ?? {}) as DateRangeFilterValue
    return (
      <Input
        aria-label={`Filter ${columnLabel(column)}`}
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
          aria-label={`Filter ${columnLabel(column)} from`}
          disabled={disabled}
          onChange={(e) => patch({ ...v, from: e.target.value })}
          size={size}
          type="time"
          value={v.from ?? ""}
        />
        <Input
          aria-label={`Filter ${columnLabel(column)} to`}
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
          aria-label={`Filter ${columnLabel(column)} from`}
          disabled={disabled}
          onChange={(e) => patch({ ...v, from: e.target.value })}
          size={size}
          type="date"
          value={v.from ?? ""}
        />
        <Input
          aria-label={`Filter ${columnLabel(column)} to`}
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

/**
 * The `date`, `datetime` and `time` editors are the same native-`Input`
 * control differing only in its `type`, so they share one factory — a fix to
 * the keyboard handling or ARIA wiring lands on all three instead of two of
 * them plus whichever was forgotten.
 */
function dateLikeEditor(
  inputType: "date" | "datetime-local" | "time"
): DataTableEditorRenderer {
  return ({
    column,
    value,
    setValue,
    disabled,
    error,
    commit,
    cancel,
    size,
    errorId,
  }) => (
    <Input
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      aria-label={`Edit ${columnLabel(column)}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      size={size}
      type={inputType}
      value={(value as string) ?? ""}
      {...editorKeyHandlers(commit, cancel)}
    />
  )
}

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
    errorId,
  }) => (
    <Input
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      aria-label={`Edit ${columnLabel(column)}`}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      size={size}
      value={(value as string) ?? ""}
      {...editorKeyHandlers(commit, cancel)}
    />
  ),

  int: (ctx) => DEFAULT_EDITOR_RENDERERS.number(ctx),

  number: ({
    column,
    value,
    setValue,
    disabled,
    commit,
    cancel,
    size,
    error,
    errorId,
  }) => (
    /*
     * `NumericInput` is a compound component whose root renders only its
     * children — self-closing it produces an empty div with no field to type
     * into. The label/validation wiring belongs on `.Input` (which spreads
     * rest props onto the real `<input>`); `describedBy` and `invalid` are
     * the root's own props and reach the input through context.
     */
    <NumericInput
      describedBy={error ? errorId : undefined}
      disabled={disabled}
      invalid={!!error}
      // Clearing the field emits `valueAsNumber: NaN`. Storing that would
      // render the literal text "NaN" in the input, and slip past `required`
      // (NaN is neither null nor ""), handing the consumer NaN on commit.
      // An empty numeric field means "no value".
      onChange={(next) => setValue(Number.isNaN(next) ? undefined : next)}
      size={size}
      value={
        typeof value === "number" && !Number.isNaN(value) ? value : undefined
      }
      /*
       * Commit/cancel keys live on the root, not on `.Input`. `.Input`
       * renders `<Input {...api.getInputProps()} {...props} />` — props
       * last — so an `onKeyDown` there replaces Zag's outright, silently
       * killing ArrowUp/ArrowDown stepping and Home/End. The root has no
       * keydown of its own, and keydown bubbles, so Zag's input handler
       * runs first and Enter/Escape still reach this one.
       */
      {...editorKeyHandlers(commit, cancel)}
    >
      <NumericInput.Control>
        <NumericInput.Input
          aria-invalid={error ? true : undefined}
          aria-label={`Edit ${columnLabel(column)}`}
        />
        <NumericInput.TriggerContainer>
          <NumericInput.IncrementTrigger />
          <NumericInput.DecrementTrigger />
        </NumericInput.TriggerContainer>
      </NumericInput.Control>
    </NumericInput>
  ),

  /*
   * The three editors below deliberately omit `editorKeyHandlers`, unlike
   * every Input/NumericInput-based one:
   *
   * - `Switch`, `FieldSelect` and `Combobox` all expose closed prop surfaces
   *   (no `onKeyDown`, no rest spread), so the handlers cannot be forwarded
   *   without widening those components' public props.
   * - For the two dropdowns, Enter and Escape already belong to the Zag
   *   select/combobox machines — Enter picks the highlighted option, Escape
   *   closes the popup. Intercepting them here would break option selection
   *   rather than add a commit shortcut.
   *
   * Committing these cells therefore goes through the row's Save action.
   */
  boolean: ({ column, value, setValue, disabled, error }) => (
    // No `aria-describedby`/`aria-invalid` here: `Switch`'s prop surface is
    // closed, so those attributes never reach the DOM and only read as
    // though the error were wired up. `validateStatus` is the supported
    // channel and does drive the underlying invalid state. Associating the
    // error text itself needs `Switch`/`Combobox` to accept `describedBy`
    // (as `NumericInput` already does) — a change to those components,
    // versioned separately from this organism.
    <Switch
      checked={Boolean(value)}
      disabled={disabled}
      onCheckedChange={setValue}
      validateStatus={error ? "error" : "default"}
    >
      <span className="sr-only">{`Edit ${columnLabel(column)}`}</span>
    </Switch>
  ),

  enum: ({ column, value, setValue, disabled, options, error, size }) => (
    <FieldSelect
      ariaLabel={`Edit ${columnLabel(column)}`}
      disabled={disabled}
      invalid={!!error}
      items={toSelectItems(options)}
      onChange={setValue}
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
      placeholder={`Edit ${columnLabel(column)}`}
      size={size}
      validateStatus={error ? "error" : "default"}
      value={(value as string[]) ?? []}
    />
  ),

  date: dateLikeEditor("date"),

  datetime: dateLikeEditor("datetime-local"),

  time: dateLikeEditor("time"),

  dateRange: ({
    column,
    value,
    setValue,
    disabled,
    error,
    errorId,
    commit,
    cancel,
    size,
  }) => {
    const v = (value ?? {}) as { from?: string; to?: string }
    return (
      <>
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          aria-label={`Edit ${columnLabel(column)} from`}
          disabled={disabled}
          onChange={(e) => setValue({ ...v, from: e.target.value })}
          size={size}
          type="date"
          value={v.from ?? ""}
          {...editorKeyHandlers(commit, cancel)}
        />
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          aria-label={`Edit ${columnLabel(column)} to`}
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
    case "notEquals":
      return text !== q
    case "notContains":
      return !text.includes(q)
    case "startsWith":
      return text.startsWith(q)
    case "endsWith":
      return text.endsWith(q)
    default:
      return text.includes(q)
  }
}

/** The `between` arm of `matchNumber`, split out to keep either half legible. */
/**
 * Exported so `evaluateCondition` (data-table.helpers.ts) can share this
 * exact bounds logic for its own `between` operator instead of keeping a
 * second hand-copied implementation that could silently diverge from this
 * one on an edge case (e.g. inclusive/exclusive bounds).
 */
export function matchBetween(
  n: number,
  cellHasNoNumber: boolean,
  f: NumberFilterValue
) {
  let lo = Number(f.value)
  let hi = Number(f.to)
  const hasLo = !(isBlank(f.value) || Number.isNaN(lo))
  const hasHi = !(isBlank(f.to) || Number.isNaN(hi))
  if (!(hasLo || hasHi)) {
    return true
  }
  if (cellHasNoNumber) {
    return false
  }
  // Both bounds typed but in the wrong order (e.g. "From" edited after "To"
  // without clearing it first) would otherwise reject every value: nothing is
  // both >= 100 and <= 10. Read as an unordered interval instead of a
  // silently-empty table.
  if (hasLo && hasHi && lo > hi) {
    ;[lo, hi] = [hi, lo]
  }
  if (hasLo && n < lo) {
    return false
  }
  return !(hasHi && n > hi)
}

function matchNumber(cell: unknown, f: NumberFilterValue) {
  const operator = f.operator ?? "equals"
  // Blankness is a property of the cell, not of the filter value, so these two
  // are answered before the "no value typed yet" short-circuit below.
  if (operator === "empty") {
    return isBlank(cell)
  }
  if (operator === "notEmpty") {
    return !isBlank(cell)
  }
  const n = Number(cell)
  /* `Number(null)` and `Number("")` are both 0, so without this a blank cell
   * would satisfy `equals 0`, `lt 5`, `lte 0` and friends. A cell with no
   * number in it satisfies no numeric comparison — but only once the filter is
   * actually constraining something, which is why each branch below returns
   * early when no bound has been typed yet. */
  const cellHasNoNumber = isBlank(cell) || Number.isNaN(n)

  if (operator === "between") {
    return matchBetween(n, cellHasNoNumber, f)
  }
  if (isBlank(f.value)) {
    return true
  }
  const target = Number(f.value)
  if (Number.isNaN(target)) {
    return true
  }
  // A cell with no number in it satisfies no *positive* numeric comparison,
  // but it does satisfy a negative one: a blank cell is trivially "not 5", and
  // dropping it made `≠` hide rows that plainly do not equal the target. The
  // text matcher already reads this way — `notContains` keeps blank cells — so
  // excluding them here made the same filter behave oppositely on a string and
  // a number column.
  if (operator === "notEquals") {
    return cellHasNoNumber || n !== target
  }
  if (cellHasNoNumber) {
    return false
  }
  switch (operator) {
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

// `to` bounds (both the cell's and the filter's) are treated as date-only —
// adding this makes an inclusive "to" mean the whole of that day, matching
// how a date picker's end date is understood. A `to` holding a full
// timestamp instead of a date-only value would shift the effective bound by
// up to a day; there's no runtime signal to distinguish the two, so this is
// a documented convention rather than something validated.
const END_OF_DAY_MS = 24 * 60 * 60 * 1000 - 1
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parse to a timestamp, reading a bare `YYYY-MM-DD` as *local* midnight.
 *
 * ECMAScript parses a date-only string as UTC but a zoneless date-time
 * (`2024-01-01T20:00:00`) as local, so comparing the two directly mixes
 * frames of reference. West of UTC that silently excluded rows from the day
 * they belong to: in UTC-5, a cell at 20:00 on Jan 1 resolves to Jan 2
 * 01:00Z and falls outside a "Jan 1" filter's UTC window. Appending a time
 * puts both sides on the same local clock.
 */
const time = (v: unknown) => {
  const raw = String(v)
  const t = new Date(DATE_ONLY_RE.test(raw) ? `${raw}T00:00:00` : raw).getTime()
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
  // Clearing a date input leaves `{ from: "" }` behind rather than dropping the
  // filter value, so "is anything constrained?" has to be asked before "is the
  // cell blank?" — otherwise an empty filter still hides every row with no
  // date. Same rule `matchNumber` follows.
  if (isBlank(f.from) && isBlank(f.to)) {
    return true
  }
  if (isBlank(cell)) {
    return false
  }
  // A dateRange column stores {from,to} per cell — compare interval overlap.
  if (typeof cell === "object" && ("from" in cell || "to" in cell)) {
    return matchRangeOverlap(cell as { from?: unknown; to?: unknown }, f)
  }
  // Via `time`, so a date-only bound is read as local midnight and lands in
  // the same frame of reference as a zoneless cell timestamp.
  const t = time(cell)
  if (t === undefined) {
    return false
  }
  return withinDateBounds(t, f)
}

/**
 * Inclusive `[from, to]` test for a single timestamp. `to` extends to the end
 * of its day so a single-day range matches that whole day.
 */
function withinDateBounds(t: number, f: DateRangeFilterValue): boolean {
  const from = f.from ? time(f.from) : undefined
  if (from !== undefined && t < from) {
    return false
  }
  const toStart = f.to ? time(f.to) : undefined
  const to = toStart === undefined ? undefined : toStart + END_OF_DAY_MS
  return !(to !== undefined && t > to)
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
  const from = toMinutes(f.from)
  const to = toMinutes(f.to)
  // No bound set means no constraint — see `matchDateRange`.
  if (from === undefined && to === undefined) {
    return true
  }
  const t = toMinutes(cell)
  if (t === undefined) {
    return false
  }
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
 * Reached through `filterFn: "typed"`, which `applyColumnDefaults` puts on
 * every column that does not name its own.
 */
/**
 * Coerce a bare filter value into the object shape the matchers expect.
 *
 * DataTable's own controls always write objects, but `filterFn: "typed"` is
 * applied to every column that does not name one — so a consumer using the
 * plain TanStack API (`column.setFilterValue("Ada")`, or a controlled
 * `columnFilters={[{ id, value: "Ada" }]}`) reached a matcher that read
 * `.operator`/`.value` off a string, found `undefined`, and returned `true`
 * for every row. The filter was stored and looked active while matching
 * everything — a silent no-op rather than an error.
 *
 * Only the unambiguous shapes are coerced. A bare value for a date column
 * could mean `from`, `to` or both, so those are left to fall through rather
 * than guessing.
 */
function normalizeFilterValue(
  type: DataTableColumnType,
  filterValue: DataTableFilterValue
): DataTableFilterValue {
  // Arrays first: `typeof [] === "object"`, so bailing out on that check
  // let `setFilterValue(["react"])` through untouched, the matcher read
  // `values` as undefined, and every row matched — reproducing the exact
  // silent no-op this function exists to prevent. An array is an
  // unambiguous `values` list for the enum types.
  if (Array.isArray(filterValue)) {
    return { values: filterValue.map(String) }
  }
  if (typeof filterValue === "object") {
    return filterValue
  }
  if (type === "enum" || type === "multiEnum") {
    return { values: [String(filterValue)] }
  }
  if (type === "boolean") {
    return { value: Boolean(filterValue) }
  }
  return { value: String(filterValue) }
}

export function typedFilterMatch(
  type: DataTableColumnType,
  cell: unknown,
  rawFilterValue: DataTableFilterValue
): boolean {
  if (rawFilterValue == null) {
    return true
  }
  const filterValue = normalizeFilterValue(type, rawFilterValue)
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
    case "custom":
      // A `"custom"` column supplies its own `renderFilter`, so the shape of
      // its filter value is whatever that control writes — the operator-based
      // `{ operator, value, to }` object in `CustomFilterTemplate`, or
      // anything else a consumer invents. `matchNumber` already parses that
      // shape correctly regardless of which operators it uses it for; routing
      // here instead of falling to `matchText` (which read the object as a
      // literal string and matched almost nothing) is a reasonable default,
      // but a `"custom"` column with a genuinely different value shape still
      // needs its own `filterFn`.
      return matchNumber(cell, filterValue as NumberFilterValue)
    default:
      return matchText(cell, filterValue as TextFilterValue)
  }
}
