/**
 * DataTable — @techsio/ui-kit organism.
 *
 * @component DataTable
 * @componentVersion v1.0.0
 * @skill data-table-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the data-table-usage skill's component_version and a changelog entry. Bump all three together.
 *
 * Headless data grid: a TanStack Table (`@tanstack/react-table`) controller that
 * renders into the presentational `Table` organism, so every cell/row/header
 * inherits the `--color-table-*` / `--padding-table-cell-*` tokens. Optional
 * virtualization (`@tanstack/react-virtual`) and drag reorder (`@dnd-kit`) load
 * only when their feature flags are set. Every interactive feature exposes a
 * callback so Storybook interaction tests can assert behaviour.
 */
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  type Cell,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Header,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  type CSSProperties,
  createContext,
  Fragment,
  type ReactNode,
  type Ref,
  type RefObject,
  type UIEvent,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Checkbox } from "../atoms/checkbox"
import { Icon, type IconType } from "../atoms/icon"
import { Input } from "../atoms/input"
import { Skeleton } from "../atoms/skeleton"
import { Menu, type MenuItem } from "../molecules/menu"
import { Pagination, type PaginationProps } from "../molecules/pagination"
import { Select, type SelectItem } from "../molecules/select"
import { tv } from "../utils"
import {
  type DataTableColumnType,
  type DataTableControlSize,
  type DataTableEditorContext,
  type DataTableEditorRenderer,
  type DataTableFilterContext,
  type DataTableFilterRenderer,
  type DataTableFilterValue,
  DEFAULT_EDITOR_RENDERERS,
  DEFAULT_FILTER_RENDERERS,
} from "./data-table.fields"
import {
  conditionalFilterFn,
  DATA_TABLE_Z,
  type DataTableGetCellSpan,
  getPinningStyles,
  isFirstRightPinned,
  isLastLeftPinned,
  typedFilterFn,
} from "./data-table.helpers"
import { Table } from "./table"

export type {
  Cell,
  Column,
  ColumnDef,
  Row,
  Table as TanstackTable,
} from "@tanstack/react-table"
export type {
  DataTableConditionalFilterValue,
  DataTableFilterOperator,
  DataTableGetCellSpan,
} from "./data-table.helpers"
// biome-ignore lint/performance/noBarrelFile: DataTable's public API intentionally re-exports the conditional-filter helpers it is designed to be used with
export {
  conditionalFilterFn,
  NUMBER_FILTER_OPERATORS,
  TEXT_FILTER_OPERATORS,
} from "./data-table.helpers"

/**
 * PROTOTYPE styling: reuses the existing `Table` component tokens
 * (`--color-table-*`, `--border-table-width`) plus semantic tokens
 * (`--color-fg-*`, `--spacing-*`). Once the MVP look is signed off, these
 * semantic references are lifted into `--color-data-table-*` component tokens
 * and mirrored into Figma via the figma-token-binding skill.
 */
const dataTableVariants = tv({
  slots: {
    wrapper: ["flex w-full flex-col"],
    toolbar: [
      "flex items-center justify-between gap-200",
      "bg-table-header-bg text-table-header-fg",
      "px-300 py-200",
      "border-b-(length:--border-table-width) border-table-border",
    ],
    toolbarStart: ["flex items-center gap-200"],
    scroll: ["relative w-full overflow-auto"],
    headerLabel: ["inline-flex items-center gap-100"],
    sortButton: [
      "inline-flex items-center gap-100",
      "cursor-pointer select-none bg-transparent text-left",
      "data-[disabled=true]:cursor-default",
    ],
    sortIcon: [
      "text-fg-secondary",
      "data-[active=true]:text-fg-accent-primary",
    ],
    dragHandle: [
      "inline-flex cursor-grab items-center rounded-table text-fg-secondary",
      "opacity-60 transition-opacity duration-200 motion-reduce:transition-none",
      "hover:bg-table-row-bg-hover hover:opacity-100 focus-visible:opacity-100",
      "group-hover/header:opacity-100 group-hover/row:opacity-100",
      "active:cursor-grabbing",
    ],
    dropIndicator: ["bg-primary"],
    resizeHandle: [
      "absolute end-0 top-0 h-full w-100 cursor-col-resize touch-none select-none",
      "opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
      "bg-table-border hover:opacity-100 focus-visible:opacity-100",
      "group-hover/header:opacity-100",
    ],
    filterRow: ["bg-table-header-bg"],
    filterCell: [
      "px-200 py-100",
      "min-w-fit",
      "border-b-(length:--border-table-width) border-table-border",
    ],
    filterControl: ["flex flex-wrap items-center gap-100"],
    editorControl: ["flex flex-col gap-50"],
    editorError: ["text-danger text-table-sm"],
    actionsCell: ["flex items-center justify-end gap-100"],
    empty: [
      "flex flex-col items-center justify-center gap-200",
      "p-700 text-center text-fg-secondary",
    ],
    paginationBar: [
      "flex flex-wrap items-center justify-end gap-300",
      "text-table-header-fg",
      "px-300 py-200",
      "border-t-(length:--border-table-width) border-table-border",
    ],
    detailBox: ["w-full p-300"],
    paginationInfo: ["whitespace-nowrap text-table-sm"],
    paginationControls: ["flex items-center gap-300"],
  },
})

/* ── Controllable state ──────────────────────────────────────────────────── */

function useControllable<S>(
  controlled: S | undefined,
  initial: S,
  callback?: (next: S) => void
): [S, OnChangeFn<S>] {
  const [internal, setInternal] = useState<S>(initial)
  const isControlled = controlled !== undefined
  const value = isControlled ? (controlled as S) : internal
  const onChange: OnChangeFn<S> = (updater) => {
    const resolve = (old: S) =>
      typeof updater === "function" ? (updater as (o: S) => S)(old) : updater
    if (isControlled) {
      // The parent owns the value; resolve against it for the callback only.
      callback?.(resolve(value))
      return
    }
    // Hand the updater to React so batched updates against the same slice
    // compose instead of the later one overwriting the earlier.
    setInternal((old) => {
      const next = resolve(old)
      queueMicrotask(() => callback?.(next))
      return next
    })
  }
  return [value, onChange]
}

/* ── Small single-value Select wrapper (page size, filter operator/value) ─── */

type DataTableSelectProps = {
  items: SelectItem[]
  value?: string
  placeholder?: string
  size?: "xs" | "sm" | "md" | "lg"
  disabled?: boolean
  "aria-label"?: string
  onValueChange?: (value: string) => void
}

function DataTableSelect({
  items,
  value,
  placeholder,
  size = "sm",
  disabled,
  "aria-label": ariaLabel,
  onValueChange,
}: DataTableSelectProps) {
  return (
    <Select
      aria-label={ariaLabel}
      disabled={disabled}
      items={items}
      onValueChange={(details) => onValueChange?.(details.value[0] ?? "")}
      size={size}
      value={value === undefined ? undefined : [value]}
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

/** Which edge of the hovered sortable should show the drop indicator. */
function dropEdge<A, B>(
  sortable: {
    isOver: boolean
    isDragging: boolean
    activeIndex: number
    overIndex: number
  },
  edges: { after: A; before: B }
) {
  if (!sortable.isOver || sortable.isDragging) {
    return
  }
  return sortable.activeIndex < sortable.overIndex ? edges.after : edges.before
}

/* ── Sortable header cell (column reorder) ───────────────────────────────── */

function SortableHeaderContent({
  columnId,
  children,
}: {
  columnId: string
  children: (args: {
    setActivatorNodeRef: (node: HTMLElement | null) => void
    listeners: Record<string, unknown> | undefined
    style: CSSProperties
    setNodeRef: (node: HTMLElement | null) => void
    isDragging: boolean
    dropSide?: "start" | "end"
    attributes: Record<string, unknown>
  }) => ReactNode
}) {
  const sortable = useSortable({ id: columnId })
  const style: CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  }
  const dropSide = dropEdge(
    {
      isOver: sortable.isOver,
      isDragging: sortable.isDragging,
      activeIndex: sortable.activeIndex ?? 0,
      overIndex: sortable.overIndex ?? 0,
    },
    { after: "end" as const, before: "start" as const }
  )
  return (
    <>
      {children({
        setActivatorNodeRef: sortable.setActivatorNodeRef,
        listeners: sortable.listeners,
        style,
        setNodeRef: sortable.setNodeRef,
        isDragging: sortable.isDragging,
        dropSide,
        attributes: sortable.attributes as unknown as Record<string, unknown>,
      })}
    </>
  )
}

/* ── Sortable body row (row reorder) ─────────────────────────────────────── */

function SortableRow<T>({
  row,
  enabled,
  children,
}: {
  row: Row<T>
  enabled: boolean
  children: (args: {
    setNodeRef: (node: HTMLElement | null) => void
    style: CSSProperties
    dragHandleProps: Record<string, unknown>
    isDragging: boolean
    dropSide?: "top" | "bottom"
  }) => ReactNode
}) {
  const sortable = useSortable({ id: row.id, disabled: !enabled })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: sortable.isDragging ? 1 : undefined,
  }
  const dropSide = dropEdge(
    {
      isOver: sortable.isOver,
      isDragging: sortable.isDragging,
      activeIndex: sortable.activeIndex ?? 0,
      overIndex: sortable.overIndex ?? 0,
    },
    { after: "bottom" as const, before: "top" as const }
  )
  const dragHandleProps = {
    ref: sortable.setActivatorNodeRef,
    ...sortable.attributes,
    ...sortable.listeners,
  }
  return (
    <>
      {children({
        setNodeRef: sortable.setNodeRef,
        style,
        dragHandleProps,
        isDragging: sortable.isDragging,
        dropSide,
      })}
    </>
  )
}

/**
 * Declarative row action. `hidden` and `disabled` are evaluated per row, so
 * availability can follow the row's id, ownership or the current user's
 * permissions.
 */
export type DataTableRowAction<T> = {
  id: string
  label: string
  icon: IconType
  tone?: "neutral" | "danger"
  /** Omit the action entirely for this row. */
  hidden?: (row: Row<T>) => boolean
  /** Render the action but block it for this row. */
  disabled?: (row: Row<T>) => boolean
  onAction: (row: Row<T>) => void
}

/** Interactions DataTable locks while a row is being edited inline. */
export type DataTableBlockedAction =
  | "sort"
  | "filter"
  | "globalFilter"
  | "paginate"
  | "select"
  | "rowReorder"
  | "columnReorder"
  | "columnVisibility"
  | "rowClick"

/* ── Context for composable sub-components ────────────────────────────────── */

type DataTableContextValue<T> = {
  table: TanstackTable<T>
  pageSizeOptions: number[]
  translations: Required<DataTableTranslations>
  /** True while an inline edit locks table-level controls. */
  locked: boolean
  /** Reports a blocked interaction; returns true when it must not proceed. */
  blocked: (action: DataTableBlockedAction) => boolean
  /** Control size shared by every nested form control. */
  size: DataTableControlSize
  paginationProps?: DataTableProps<T>["paginationProps"]
}

const DataTableContext = createContext<DataTableContextValue<unknown> | null>(
  null
)

function useDataTableContext<T>() {
  const ctx = useContext(DataTableContext) as DataTableContextValue<T> | null
  if (!ctx) {
    throw new Error("DataTable sub-components must be used within DataTable")
  }
  return ctx
}

/* ── Props ───────────────────────────────────────────────────────────────── */

export type DataTableTranslations = {
  searchPlaceholder?: string
  columnsLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  pageSizeLabel?: string
  actionsLabel?: string
  filtersLabel?: string
  selectAllLabel?: string
  loadingLabel?: string
  editingLabel?: string
  rangeLabel?: (info: { start: number; end: number; total: number }) => string
}

const DEFAULT_TRANSLATIONS: Required<DataTableTranslations> = {
  searchPlaceholder: "Search…",
  columnsLabel: "Columns",
  emptyTitle: "No records",
  emptyDescription: "There is no data to display.",
  pageSizeLabel: "Rows per page",
  actionsLabel: "Actions",
  filtersLabel: "Column filters",
  selectAllLabel: "Select all rows",
  loadingLabel: "Loading data",
  editingLabel: "Editing a row — other table controls are locked",
  rangeLabel: ({ start, end, total }) => `${start}–${end} of ${total}`,
}

export type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  getRowId?: (row: T, index: number) => string
  /** Stable id for the wrapper element; falls back to a generated one. */
  id?: string
  className?: string
  ref?: Ref<HTMLDivElement>

  /* Presentation (passed through to the Table organism) */
  variant?: "line" | "outline" | "striped"
  /**
   * Zebra-stripe body rows. Independent of `variant`, so striping composes with
   * `variant="outline"` (the `variant="striped"` value cannot).
   */
  striped?: boolean
  size?: "sm" | "md" | "lg"
  stickyHeader?: boolean
  interactive?: boolean
  showColumnBorder?: boolean
  caption?: ReactNode
  /** Hide the column header row(s) entirely (headerless / borderless layouts). */
  hideHeader?: boolean
  /** Height of the scroll container; enables sticky header / infinite scroll. */
  maxHeight?: string

  /* Feature flags */
  enableSorting?: boolean
  enableGlobalFilter?: boolean
  enableColumnFilters?: boolean
  enableRowSelection?: boolean
  /**
   * `"multiple"` (default) lets any number of rows be selected; `"single"`
   * replaces the selection so only one row is ever selected.
   */
  selectionMode?: "single" | "multiple"
  /**
   * Hard cap on how many rows can be selected at once. Once reached, unselected
   * rows report `getCanSelect() === false` and their checkboxes disable, while
   * already-selected rows stay deselectable.
   */
  maxSelectedRows?: number
  /**
   * Per-row selectability predicate, for rules the mode/cap can't express
   * (e.g. "only rows with status=active"). Composed with — not instead of —
   * `selectionMode` and `maxSelectedRows`.
   */
  canSelectRow?: (
    row: Row<T>,
    context: { selectedCount: number; isSelected: boolean }
  ) => boolean
  /** Fired when a selection change reaches `maxSelectedRows`. */
  onSelectionLimitReached?: (details: {
    limit: number
    selectedCount: number
  }) => void
  enableColumnVisibility?: boolean
  enableColumnPinning?: boolean
  enableColumnReorder?: boolean
  enableColumnResizing?: boolean
  enableRowReorder?: boolean
  enableExpanding?: boolean
  enablePagination?: boolean
  enableVirtualization?: boolean

  /* Tree / sub-rows */
  getSubRows?: (row: T) => T[] | undefined
  /**
   * Whether a row can expand. Defaults to "any row" when `renderExpandedRow` is
   * given (master-detail), otherwise to "only rows that have sub-rows".
   */
  getRowCanExpand?: (row: Row<T>) => boolean

  /* colSpan / rowSpan */
  getCellSpan?: DataTableGetCellSpan<T>

  /* Controlled state (+ change callbacks; all optional/uncontrolled by default) */
  sorting?: SortingState
  onSortingChange?: (state: SortingState) => void
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: (state: ColumnFiltersState) => void
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (state: RowSelectionState) => void
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (state: VisibilityState) => void
  columnOrder?: string[]
  onColumnOrderChange?: (order: string[]) => void
  columnPinning?: ColumnPinningState
  onColumnPinningChange?: (state: ColumnPinningState) => void
  expanded?: ExpandedState
  onExpandedChange?: (state: ExpandedState) => void
  pagination?: PaginationState
  onPaginationChange?: (state: PaginationState) => void
  pageSizeOptions?: number[]

  /* Server-side / manual mode */
  manualSorting?: boolean
  manualFiltering?: boolean
  manualPagination?: boolean
  rowCount?: number
  pageCount?: number

  /* Callbacks */
  onRowClick?: (
    row: Row<T>,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => void
  onReachEnd?: () => void
  onColumnReorder?: (details: {
    from: number
    to: number
    columnId: string
    order: string[]
  }) => void
  onRowReorder?: (details: {
    from: number
    to: number
    rowId: string
    data: T[]
  }) => void
  onCellEditCommit?: (details: {
    rowId: string
    columnId: string
    value: unknown
    row: T
  }) => void
  onReady?: (table: TanstackTable<T>) => void

  /* ── Inline row editing ────────────────────────────────────────────────
   * Editing a row puts the table into a modal-ish state: the row's editable
   * cells swap to type-driven editors and, unless opted out, every interaction
   * that could move the row out from under the user (sort, filter, paginate,
   * reorder, selection) is locked until commit/cancel. */
  enableInlineEdit?: boolean
  /**
   * Per-row gate for the built-in edit action. Returning false disables the
   * edit affordance and refuses `startEdit` for that row.
   */
  canEditRow?: (row: Row<T>) => boolean
  /**
   * Declarative actions rendered in the actions cell, each able to hide or
   * disable itself per row.
   */
  rowActions?: DataTableRowAction<T>[]
  /** Controlled id of the row being edited (`null` = not editing). */
  editingRowId?: string | null
  onEditingRowIdChange?: (rowId: string | null) => void
  onEditStart?: (details: { rowId: string; row: T }) => void
  onEditChange?: (details: {
    rowId: string
    columnId: string
    value: unknown
    draft: Record<string, unknown>
  }) => void
  onEditCommit?: (details: {
    rowId: string
    draft: Record<string, unknown>
    row: T
  }) => void
  onEditCancel?: (details: { rowId: string; dirty: boolean }) => void
  onEditValidationError?: (details: {
    rowId: string
    errors: Record<string, string>
  }) => void
  /**
   * Lock sorting/filtering/pagination/selection/reorder while a row is being
   * edited (default `true`). Turning this off is possible but means the edited
   * row can be re-sorted or filtered away mid-edit.
   */
  lockInteractionsWhileEditing?: boolean
  /** Fired when a locked interaction is attempted during an edit. */
  onInteractionBlocked?: (details: {
    action: DataTableBlockedAction
    reason: "editing"
    rowId: string
  }) => void

  /* Type-driven field renderers (per-table override; per-column via meta) */
  filterRenderers?: Partial<
    Record<DataTableColumnType, DataTableFilterRenderer<T>>
  >
  editorRenderers?: Partial<
    Record<DataTableColumnType, DataTableEditorRenderer<T>>
  >

  /** Pin the row-actions column to the right edge (sticky). Default `true`. */
  stickyActions?: boolean

  /**
   * Human-readable label for a row, used by selection checkboxes and the edit
   * action instead of the opaque row id.
   */
  getRowLabel?: (row: Row<T>) => string
  /** Replace the body with skeleton rows while the first page is being fetched. */
  loading?: boolean
  /** How many skeleton rows to render while `loading`. */
  loadingRowCount?: number
  /** Append a skeleton row while an infinite-scroll page is being fetched. */
  loadingMore?: boolean

  /**
   * Everything configurable on the `Pagination` molecule, surfaced at table
   * level. `count`/`page`/`pageSize` stay owned by the table's pagination state.
   */
  paginationProps?: Omit<
    PaginationProps,
    "count" | "page" | "pageSize" | "onPageChange" | "onChange"
  >

  /* Slots */
  renderToolbar?: (table: TanstackTable<T>) => ReactNode
  renderEmpty?: () => ReactNode
  /** Row actions; receives edit-mode state so you can swap in save/cancel. */
  renderRowActions?: (
    row: Row<T>,
    state: {
      isEditing: boolean
      startEdit: () => void
      commitEdit: () => void
      cancelEdit: () => void
      disabled: boolean
    }
  ) => ReactNode
  renderHeaderFilter?: (column: Column<T, unknown>) => ReactNode
  renderExpandedRow?: (row: Row<T>) => ReactNode

  /* Passthrough for DOM access to nested layers */
  slotProps?: {
    root?: React.HTMLAttributes<HTMLTableElement>
    header?: React.HTMLAttributes<HTMLTableSectionElement>
    body?: React.HTMLAttributes<HTMLTableSectionElement>
    row?: React.HTMLAttributes<HTMLTableRowElement> & {
      ref?: Ref<HTMLTableRowElement>
    }
  }

  translations?: DataTableTranslations
  /** Estimated row height (px) for virtualization. */
  estimateRowHeight?: number
  /** Distance from bottom (px) that triggers `onReachEnd`. */
  reachEndThreshold?: number
}

const SELECTION_COLUMN_ID = "__select"
const EXPANDER_COLUMN_ID = "__expander"
const DRAG_COLUMN_ID = "__drag"

type DataTableStyles = ReturnType<typeof dataTableVariants>

/** Sticky-edge classes for a pinned cell (opaque bg + edge shadow). */
function pinClass<T>(column: Column<T, unknown>, kind: "header" | "body") {
  if (!column.getIsPinned()) {
    return
  }
  return [
    kind === "header" ? "bg-table-header-bg" : "bg-table-bg",
    isLastLeftPinned(column)
      ? "border-r-(length:--border-table-width) border-table-border"
      : "",
    isFirstRightPinned(column)
      ? "border-l-(length:--border-table-width) border-table-border"
      : "",
  ].join(" ")
}

/** Column drag handle rendered in the header cell. */
function HeaderDragHandle({
  styles,
  setActivatorNodeRef,
  listeners,
  attributes,
  label,
}: {
  styles: DataTableStyles
  label: string
  setActivatorNodeRef: (node: HTMLElement | null) => void
  listeners: Record<string, unknown> | undefined
  attributes?: Record<string, unknown>
}) {
  return (
    <button
      aria-label={`Drag to reorder ${label}`}
      className={styles.dragHandle()}
      ref={setActivatorNodeRef as unknown as Ref<HTMLButtonElement>}
      type="button"
      {...attributes}
      {...listeners}
    >
      <Icon icon="icon-[mdi--drag-vertical]" size="current" />
    </button>
  )
}

/** Header label with the optional sort toggle + direction icon. */
function HeaderSortLabel<T>({
  header,
  styles,
  enableSorting,
  locked,
  onBlocked,
}: {
  header: Header<T, unknown>
  styles: DataTableStyles
  enableSorting: boolean
  locked?: boolean
  onBlocked?: () => void
}) {
  const column = header.column
  const canSort = enableSorting && column.getCanSort()
  const sortDir = column.getIsSorted()
  const label = header.isPlaceholder
    ? null
    : flexRender(column.columnDef.header, header.getContext())

  if (!canSort) {
    return <>{label}</>
  }

  let sortIconName: IconType = "icon-[mdi--unfold-more-horizontal]"
  if (sortDir === "desc") {
    sortIconName = "token-icon-chevron-down"
  } else if (sortDir === "asc") {
    sortIconName = "token-icon-chevron-up"
  }

  return (
    <button
      className={styles.sortButton()}
      data-disabled={locked || undefined}
      disabled={locked}
      onClick={(event) => {
        if (locked) {
          onBlocked?.()
          return
        }
        column.getToggleSortingHandler()?.(event)
      }}
      type="button"
    >
      {label}
      <Icon
        className={styles.sortIcon()}
        data-active={!!sortDir}
        icon={sortIconName}
        size="current"
      />
    </button>
  )
}

/** One body cell: pin styling, colSpan/rowSpan, tree indent, drag handle. */
/** Cell body: drag handle, active inline editor, or the column's cell template. */
function renderCellContent<T>({
  cell,
  column,
  styles,
  enableRowReorder,
  dnd,
  editor,
  editorError,
  editorErrorId,
  isDragCol,
  rowLabel,
}: {
  cell: Cell<T, unknown>
  column: Column<T, unknown>
  rowLabel: string
  styles: DataTableStyles
  enableRowReorder: boolean
  dnd?: { dragHandleProps: Record<string, unknown> }
  editor?: ReactNode
  editorError?: string
  editorErrorId?: string
  isDragCol: boolean
}) {
  if (isDragCol && enableRowReorder && dnd) {
    return (
      <button
        aria-label={`Drag to reorder ${rowLabel}`}
        className={styles.dragHandle()}
        onClick={(e) => e.stopPropagation()}
        type="button"
        {...dnd.dragHandleProps}
      >
        <Icon icon="icon-[mdi--drag-horizontal]" size="current" />
      </button>
    )
  }
  if (editor) {
    return (
      <div className={styles.editorControl()} data-editor-control="">
        {editor}
        {editorError ? (
          <span
            className={styles.editorError()}
            id={editorErrorId}
            role="alert"
          >
            {editorError}
          </span>
        ) : null}
      </div>
    )
  }
  return flexRender(column.columnDef.cell, cell.getContext())
}

function DataTableBodyCell<T>({
  cell,
  span,
  row,
  styles,
  enableColumnResizing,
  enableRowReorder,
  dnd,
  editor,
  editorError,
  editorErrorId,
  indentColumnId,
  rowLabel,
}: {
  cell: Cell<T, unknown>
  span: { colSpan?: number; rowSpan?: number } | undefined
  row: Row<T>
  styles: DataTableStyles
  enableColumnResizing: boolean
  enableRowReorder: boolean
  dnd?: { dragHandleProps: Record<string, unknown> }
  editor?: ReactNode
  editorError?: string
  editorErrorId?: string
  indentColumnId?: string
  rowLabel: string
}) {
  const column = cell.column
  const pinned = column.getIsPinned()
  const numeric = column.columnDef.meta?.align === "end"
  const isDragCol = column.id === DRAG_COLUMN_ID
  const indent =
    row.depth > 0 && column.id === indentColumnId
      ? { paddingInlineStart: `${row.depth * 1.5}rem` }
      : undefined

  return (
    <Table.Cell
      className={pinClass(column, "body")}
      colSpan={span?.colSpan}
      data-pinned={pinned || undefined}
      numeric={numeric}
      rowSpan={span?.rowSpan}
      style={{
        ...getPinningStyles(column),
        width: enableColumnResizing ? column.getSize() : undefined,
        ...indent,
      }}
    >
      {renderCellContent({
        cell,
        column,
        styles,
        enableRowReorder,
        dnd,
        editor,
        editorError,
        editorErrorId,
        isDragCol,
        rowLabel,
      })}
    </Table.Cell>
  )
}

/** Run `required` + `meta.validate` over a row draft, returning field errors. */
function validateDraft<T>(
  columns: Column<T, unknown>[],
  draft: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const column of columns) {
    const meta = column.columnDef.meta
    if (!meta?.editable) {
      continue
    }
    const value = draft[column.id]
    const empty =
      value == null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    if (meta.required && empty) {
      errors[column.id] = "Required"
      continue
    }
    const message = meta.validate?.(value, draft)
    if (message) {
      errors[column.id] = message
    }
  }
  return errors
}

/** Row classes conveying drag state: lifted while dragging, edge while hovered. */
function rowDragClass(
  dnd: { isDragging?: boolean; dropSide?: "top" | "bottom" } | undefined,
  className?: string,
  striped?: boolean
) {
  return [
    "group/row",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-primary",
    striped
      ? "odd:bg-table-row-striped-primary even:bg-table-row-striped-secondary"
      : "",
    dnd?.isDragging ? "shadow-table-outline" : "",
    dnd?.dropSide === "top" ? "border-primary border-t-2" : "",
    dnd?.dropSide === "bottom" ? "border-primary border-b-2" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * Opaque header surface. `--color-table-header-bg` resolves to a ~5% tint
 * (`--color-fill-base`), which is fine for a static header but lets scrolled
 * content show through sticky or frozen header cells — two labels end up
 * legible at once. Compositing the tint over the table surface keeps the exact
 * same colour while being fully opaque.
 */
const OPAQUE_HEADER_BG: CSSProperties = {
  backgroundColor: "var(--color-table-bg)",
  backgroundImage:
    "linear-gradient(var(--color-table-header-bg), var(--color-table-header-bg))",
}

/** Human-readable column name for generated labels. */
function columnDisplayName<T>(column: Column<T, unknown>) {
  const header = column.columnDef.header
  return typeof header === "string" && header ? header : column.id
}

/** `aria-sort` for a header cell, or undefined when the column is not sortable. */
function sortState<T>(column: Column<T, unknown>, enableSorting: boolean) {
  if (!(enableSorting && column.getCanSort())) {
    return
  }
  const sorted = column.getIsSorted()
  if (sorted === "asc") {
    return "ascending" as const
  }
  if (sorted === "desc") {
    return "descending" as const
  }
  return "none" as const
}

/** Enter/Space activates a clickable row, ignoring keys bubbling from controls. */
function activateRowByKeyboard(
  event: React.KeyboardEvent<HTMLTableRowElement>,
  activate: () => void
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return
  }
  if (event.target !== event.currentTarget) {
    return
  }
  event.preventDefault()
  activate()
}

/** Row ref: the sortable node ref, plus a handle on the row being edited. */
function composeRowRef(
  isEditedRow: boolean,
  editRowRef: { current: HTMLTableRowElement | null },
  dnd: { setNodeRef: (node: HTMLElement | null) => void } | undefined,
  consumerRef: Ref<HTMLTableRowElement> | undefined
) {
  return ((node: HTMLTableRowElement | null) => {
    if (isEditedRow) {
      editRowRef.current = node
    }
    dnd?.setNodeRef(node)
    if (typeof consumerRef === "function") {
      consumerRef(node)
    } else if (consumerRef) {
      ;(consumerRef as { current: HTMLTableRowElement | null }).current = node
    }
  }) as unknown as RefObject<HTMLTableRowElement>
}

/* ── Component ───────────────────────────────────────────────────────────── */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a feature-complete data-grid controller wiring ~20 optional features into one instance
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    data,
    columns: userColumns,
    getRowId,
    id: idProp,
    className,
    ref,
    variant = "line",
    size = "md",
    stickyHeader,
    interactive,
    showColumnBorder,
    caption,
    hideHeader,
    maxHeight,
    enableSorting = true,
    enableGlobalFilter = false,
    enableColumnFilters = false,
    enableRowSelection = false,
    enableColumnVisibility = false,
    enableColumnPinning = false,
    enableColumnReorder = false,
    enableColumnResizing = false,
    enableRowReorder = false,
    enableExpanding = false,
    enablePagination = false,
    enableVirtualization = false,
    getSubRows,
    getRowCanExpand,
    getCellSpan,
    sorting: sortingProp,
    onSortingChange,
    columnFilters: columnFiltersProp,
    onColumnFiltersChange,
    globalFilter: globalFilterProp,
    onGlobalFilterChange,
    rowSelection: rowSelectionProp,
    onRowSelectionChange,
    columnVisibility: columnVisibilityProp,
    onColumnVisibilityChange,
    columnOrder: columnOrderProp,
    onColumnOrderChange,
    columnPinning: columnPinningProp,
    onColumnPinningChange,
    expanded: expandedProp,
    onExpandedChange,
    pagination: paginationProp,
    onPaginationChange,
    pageSizeOptions = [10, 25, 50, 100],
    manualSorting,
    manualFiltering,
    manualPagination,
    rowCount,
    pageCount,
    onRowClick,
    onReachEnd,
    onColumnReorder,
    onRowReorder,
    onCellEditCommit,
    onReady,
    renderToolbar,
    renderEmpty,
    renderRowActions,
    renderHeaderFilter,
    renderExpandedRow,
    slotProps,
    translations: translationsProp,
    estimateRowHeight = 44,
    reachEndThreshold = 240,
    enableInlineEdit = false,
    editingRowId: editingRowIdProp,
    onEditingRowIdChange,
    onEditStart,
    onEditChange,
    onEditCommit,
    onEditCancel,
    onEditValidationError,
    lockInteractionsWhileEditing = true,
    onInteractionBlocked,
    filterRenderers,
    editorRenderers,
    stickyActions = true,
    paginationProps,
    canEditRow,
    rowActions,
    getRowLabel,
    striped = false,
    loading = false,
    loadingRowCount = 5,
    loadingMore = false,
    selectionMode = "multiple",
    maxSelectedRows,
    canSelectRow,
    onSelectionLimitReached,
  } = props

  const translations = { ...DEFAULT_TRANSLATIONS, ...translationsProp }
  const styles = dataTableVariants()
  const generatedId = useId()
  const instanceId = idProp ?? generatedId
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const reachedEndRef = useRef(false)
  const headerRowRef = useRef<HTMLTableRowElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  /* Controlled/uncontrolled state slices */
  const [sorting, setSorting] = useControllable<SortingState>(
    sortingProp,
    [],
    onSortingChange
  )
  const [columnFilters, setColumnFilters] = useControllable<ColumnFiltersState>(
    columnFiltersProp,
    [],
    onColumnFiltersChange
  )
  const [globalFilter, setGlobalFilter] = useControllable<string>(
    globalFilterProp,
    "",
    onGlobalFilterChange
  )
  const [rowSelection, setRowSelectionState] =
    useControllable<RowSelectionState>(
      rowSelectionProp,
      {},
      onRowSelectionChange
    )

  /**
   * Enforce `maxSelectedRows` on the resolved state rather than only through
   * `getCanSelect`: TanStack applies sub-row and select-all toggles in a single
   * updater, so a per-row predicate reading render-time state cannot see the
   * count growing and the cap would be bypassed.
   */
  const setRowSelection: OnChangeFn<RowSelectionState> = (updater) => {
    setRowSelectionState((old) => {
      const next =
        typeof updater === "function"
          ? (updater as (o: RowSelectionState) => RowSelectionState)(old)
          : updater
      if (maxSelectedRows == null) {
        return next
      }
      const selectedIds = Object.keys(next).filter((id) => next[id])
      if (selectedIds.length <= maxSelectedRows) {
        return next
      }
      // Keep rows that were already selected, then fill up to the cap.
      const kept = [
        ...selectedIds.filter((id) => old[id]),
        ...selectedIds.filter((id) => !old[id]),
      ].slice(0, maxSelectedRows)
      onSelectionLimitReached?.({
        limit: maxSelectedRows,
        selectedCount: kept.length,
      })
      return Object.fromEntries(kept.map((id) => [id, true]))
    })
  }

  const [columnVisibility, setColumnVisibility] =
    useControllable<VisibilityState>(
      columnVisibilityProp,
      {},
      onColumnVisibilityChange
    )
  const [columnOrder, setColumnOrder] = useControllable<string[]>(
    columnOrderProp,
    [],
    onColumnOrderChange
  )
  const [columnPinning, setColumnPinning] = useControllable<ColumnPinningState>(
    columnPinningProp,
    {},
    onColumnPinningChange
  )
  const [expanded, setExpanded] = useControllable<ExpandedState>(
    expandedProp,
    {},
    onExpandedChange
  )
  const [pagination, setPagination] = useControllable<PaginationState>(
    paginationProp,
    { pageIndex: 0, pageSize: pageSizeOptions[0] ?? 10 },
    onPaginationChange
  )
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})

  /* Inject built-in leading columns (drag handle, selection, expander). */
  const editTriggerIdRef = useRef<string | null>(null)
  const editRowRef = useRef<HTMLTableRowElement | null>(null)
  const [editingRowIdState, setEditingRowIdState] = useState<string | null>(
    null
  )
  const editingRowId =
    editingRowIdProp === undefined ? editingRowIdState : editingRowIdProp
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const isEditing = editingRowId != null
  const locked = isEditing && lockInteractionsWhileEditing

  const setEditingRowId = (next: string | null) => {
    setEditingRowIdState(next)
    onEditingRowIdChange?.(next)
  }

  /**
   * Guard for interactions that are locked during an inline edit. Reports the
   * attempt through `onInteractionBlocked` and returns true when blocked.
   */
  const blocked = (
    action: Parameters<NonNullable<typeof onInteractionBlocked>>[0]["action"]
  ) => {
    if (!locked) {
      return false
    }
    onInteractionBlocked?.({
      action,
      reason: "editing",
      rowId: editingRowId as string,
    })
    return true
  }

  const selectedCount = Object.values(rowSelection).filter(Boolean).length
  const selectionLimitReached =
    maxSelectedRows != null && selectedCount >= maxSelectedRows

  /**
   * Per-row selectability: the `canSelectRow` predicate, the `maxSelectedRows`
   * cap (already-selected rows stay deselectable) and `enableRowSelection`
   * composed into the single function TanStack expects.
   */
  const rowSelectionPredicate = (row: Row<T>) => {
    const isSelected = rowSelection[row.id] === true
    if (canSelectRow && !canSelectRow(row, { selectedCount, isSelected })) {
      return false
    }
    if (selectionLimitReached && !isSelected) {
      return false
    }
    return true
  }

  const columns = buildColumns<T>({
    userColumns,
    enableRowReorder,
    enableRowSelection,
    locked,
    getRowLabel,
    selectAllLabel: translations.selectAllLabel,
    showSelectAll: selectionMode === "multiple" && maxSelectedRows == null,
    onBlockedSelect: () => blocked("select"),
  })

  const table = useReactTable<T>({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
      columnOrder,
      columnPinning,
      expanded,
      pagination,
      columnSizing,
    },
    enableSorting,
    enableRowSelection: enableRowSelection ? rowSelectionPredicate : false,
    enableMultiRowSelection: selectionMode === "multiple",
    enableColumnFilters,
    enableColumnPinning,
    enableColumnResizing,
    columnResizeMode: "onChange",
    manualSorting,
    manualFiltering,
    manualPagination,
    rowCount,
    pageCount,
    getSubRows,
    getRowCanExpand:
      getRowCanExpand ?? (renderExpandedRow ? () => true : undefined),
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel:
      enableColumnFilters || enableGlobalFilter
        ? getFilteredRowModel()
        : undefined,
    getPaginationRowModel:
      enablePagination && !manualPagination
        ? getPaginationRowModel()
        : undefined,
    globalFilterFn: "includesString",
    filterFns: { conditional: conditionalFilterFn, typed: typedFilterFn },
    meta: {
      updateData: (rowId: string, columnId: string, value: unknown) => {
        const target = table.getCoreRowModel().rowsById[rowId]
        if (!target) {
          return
        }
        onCellEditCommit?.({ rowId, columnId, value, row: target.original })
      },
    },
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: fire only when the (stable) table instance changes, not on every render or onReady identity change
  useEffect(() => {
    onReady?.(table)
  }, [table])

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus follows the edited row, not the callbacks
  useEffect(() => {
    if (editingRowId) {
      // Scope to the editor wrappers so the (disabled) selection checkbox and
      // other row controls are never picked, and include button-based editors.
      const candidates = editRowRef.current?.querySelectorAll<HTMLElement>(
        "[data-editor-control] input, [data-editor-control] select, [data-editor-control] textarea, [data-editor-control] button"
      )
      const first = Array.from(candidates ?? []).find(
        (node) => !(node as HTMLButtonElement).disabled
      )
      first?.focus()
      return
    }
    // The pencil that opened the edit is unmounted while editing, so restore
    // focus by id rather than by holding a (now detached) node.
    const trigger = editTriggerIdRef.current
      ? document.getElementById(editTriggerIdRef.current)
      : null
    trigger?.focus()
    editTriggerIdRef.current = null
  }, [editingRowId])

  // Draft state is cleared when the edit actually ends, so a controlled
  // `editingRowId` held open across an async save keeps its values.
  useEffect(() => {
    if (!editingRowId) {
      setDraft({})
      setEditErrors({})
      setDirty(false)
    }
  }, [editingRowId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: watches the edited row's existence, not the cancel identity
  useEffect(() => {
    if (editingRowId && !table.getCoreRowModel().rowsById[editingRowId]) {
      cancelEdit()
    }
  }, [editingRowId, data])

  useEffect(() => {
    const node = headerRowRef.current
    if (!(node && stickyHeader)) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry?.contentRect.height ?? 0)
    })
    observer.observe(node)
    setHeaderHeight(node.getBoundingClientRect().height)
    return () => observer.disconnect()
  }, [stickyHeader])

  const startEdit = (row: Row<T>) => {
    if (isEditing || (canEditRow && !canEditRow(row))) {
      return
    }
    editTriggerIdRef.current = `${instanceId}-edit-${row.id}`
    const initial: Record<string, unknown> = {}
    for (const column of table.getAllLeafColumns()) {
      if (column.columnDef.meta?.editable) {
        initial[column.id] = row.getValue(column.id)
      }
    }
    setDraft(initial)
    setEditErrors({})
    setDirty(false)
    setEditingRowId(row.id)
    onEditStart?.({ rowId: row.id, row: row.original })
  }

  const setDraftValue = (rowId: string, columnId: string, value: unknown) => {
    const next = { ...draft, [columnId]: value }
    setDraft(next)
    onEditChange?.({ rowId, columnId, value, draft: next })
    setDirty(true)
    // Clear this field's stale error as soon as the user edits it again.
    setEditErrors((old) => (old[columnId] ? { ...old, [columnId]: "" } : old))
  }

  const cancelEdit = () => {
    if (!isEditing) {
      return
    }
    const rowId = editingRowId as string
    setEditingRowId(null)
    onEditCancel?.({ rowId, dirty })
  }

  const commitEdit = () => {
    if (!isEditing) {
      return
    }
    const rowId = editingRowId as string
    const row = table.getCoreRowModel().rowsById[rowId]
    if (!row) {
      // The record disappeared mid-edit (deleted, replaced, refetched);
      // releasing the lock beats throwing or committing onto a stranger.
      cancelEdit()
      return
    }
    const errors = validateDraft(table.getAllLeafColumns(), draft)

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      onEditValidationError?.({ rowId, errors })
      return
    }

    onEditCommit?.({ rowId, draft, row: row.original })
    setEditingRowId(null)
  }

  const rows = table.getRowModel().rows
  const leafColumns = table.getVisibleLeafColumns()
  const columnCount = leafColumns.length

  /* Virtualization (windowing that preserves native table column alignment). */
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 12,
    enabled: enableVirtualization,
  })
  const virtualItems = enableVirtualization
    ? rowVirtualizer.getVirtualItems()
    : []
  const firstVirtual = virtualItems[0]
  const lastVirtual = virtualItems.at(-1)
  const paddingTop = firstVirtual ? firstVirtual.start : 0
  const paddingBottom = lastVirtual
    ? rowVirtualizer.getTotalSize() - lastVirtual.end
    : 0
  const renderRows: Row<T>[] = enableVirtualization
    ? virtualItems
        .map((vi) => rows[vi.index])
        .filter((r): r is Row<T> => r !== undefined)
    : rows

  /* dnd sensors */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Without `maxHeight` the table does not scroll itself, so infinite scroll has
  // to observe the page instead of the container.
  useEffect(() => {
    if (!onReachEnd || maxHeight) {
      return
    }
    const onWindowScroll = () => {
      const distance =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight
      if (distance <= reachEndThreshold) {
        if (!reachedEndRef.current) {
          reachedEndRef.current = true
          onReachEnd()
        }
      } else {
        reachedEndRef.current = false
      }
    }
    window.addEventListener("scroll", onWindowScroll, { passive: true })
    return () => window.removeEventListener("scroll", onWindowScroll)
  }, [onReachEnd, maxHeight, reachEndThreshold])

  // Re-arm after new rows land: if the freshly appended page is shorter than
  // the threshold no further scroll event fires, and loading would stall.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-checks whenever the row count changes
  useEffect(() => {
    if (!onReachEnd || loadingMore) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    reachedEndRef.current = distance <= reachEndThreshold
    if (reachedEndRef.current && el.scrollHeight > el.clientHeight) {
      onReachEnd()
    }
  }, [data.length, loadingMore, reachEndThreshold])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!onReachEnd) {
      return
    }
    const el = event.currentTarget
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance <= reachEndThreshold) {
      if (!reachedEndRef.current) {
        reachedEndRef.current = true
        onReachEnd()
      }
    } else {
      reachedEndRef.current = false
    }
  }

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    // Seed from ALL leaf columns (not just visible ones) so a reorder while
    // some columns are hidden doesn't drop the hidden ids from columnOrder.
    const current = table.getState().columnOrder.length
      ? table.getState().columnOrder
      : table.getAllLeafColumns().map((c) => c.id)
    const from = current.indexOf(active.id as string)
    const to = current.indexOf(over.id as string)
    if (from === -1 || to === -1) {
      return
    }
    const next = arrayMove(current, from, to)
    setColumnOrder(next)
    onColumnReorder?.({ from, to, columnId: active.id as string, order: next })
  }

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    // Map the dragged/target display rows back to their positions in the
    // original `data` array — display order may be sorted/filtered/paginated,
    // so row-model indices must not be applied to `data` directly.
    const activeRow = rows.find((r) => r.id === active.id)
    const overRow = rows.find((r) => r.id === over.id)
    if (!(activeRow && overRow)) {
      return
    }
    const from = data.indexOf(activeRow.original)
    const to = data.indexOf(overRow.original)
    if (from === -1 || to === -1) {
      return
    }
    const next = arrayMove([...data], from, to)
    onRowReorder?.({ from, to, rowId: active.id as string, data: next })
  }

  const hasFooter = table
    .getAllLeafColumns()
    .some((c) => c.columnDef.footer != null)

  const builtinIds = new Set<string>([
    DRAG_COLUMN_ID,
    SELECTION_COLUMN_ID,
    EXPANDER_COLUMN_ID,
  ])
  const indentColumnId = leafColumns.find((c) => !builtinIds.has(c.id))?.id
  const reorderableLeafIds = leafColumns
    .filter((c) => !builtinIds.has(c.id))
    .map((c) => c.id)

  const hasActionsColumn =
    !!renderRowActions ||
    !!rowActions?.length ||
    enableInlineEdit ||
    (enableExpanding && !!renderExpandedRow)

  /**
   * Resolve a column's header filter: per-column `meta.renderFilter`, then the
   * table-wide `renderHeaderFilter` slot, then the type-driven default.
   */
  const renderColumnFilter = (column: Column<T, unknown>) => {
    const meta = column.columnDef.meta
    const type: DataTableColumnType = meta?.type ?? "string"
    const ctx: DataTableFilterContext<T> = {
      column,
      type,
      value: column.getFilterValue() as DataTableFilterValue | undefined,
      setValue: (next) => {
        if (blocked("filter")) {
          return
        }
        column.setFilterValue(next)
      },
      disabled: locked,
      size,
      options: meta?.options ?? meta?.filterOptions ?? [],
    }
    if (meta?.renderFilter) {
      return meta.renderFilter(ctx)
    }
    const slot = renderHeaderFilter?.(column)
    if (slot != null) {
      return slot
    }
    const renderer =
      filterRenderers?.[type] ??
      (DEFAULT_FILTER_RENDERERS[type] as DataTableFilterRenderer<T>)
    return renderer?.(ctx) ?? null
  }

  const renderHeaderCell = (
    header: Header<T, unknown>,
    dnd?: {
      setNodeRef: (node: HTMLElement | null) => void
      setActivatorNodeRef: (node: HTMLElement | null) => void
      listeners: Record<string, unknown> | undefined
      style: CSSProperties
      isDragging: boolean
      dropSide?: "start" | "end"
      attributes: Record<string, unknown>
    }
  ) => {
    const column = header.column
    const ariaSort = sortState(column, enableSorting)
    let dropClass = ""
    if (dnd?.dropSide === "start") {
      dropClass = "border-primary border-s-2"
    } else if (dnd?.dropSide === "end") {
      dropClass = "border-primary border-e-2"
    }
    return (
      <Table.ColumnHeader
        aria-sort={ariaSort}
        className={`group/header relative ${pinClass(column, "header") ?? ""} ${dropClass}`}
        colSpan={header.colSpan}
        data-dragging={dnd?.isDragging || undefined}
        data-pinned={column.getIsPinned() || undefined}
        numeric={column.columnDef.meta?.align === "end"}
        ref={dnd?.setNodeRef as unknown as RefObject<HTMLTableCellElement>}
        style={{
          ...OPAQUE_HEADER_BG,
          ...getPinningStyles(column, "header"),
          ...dnd?.style,
          width: enableColumnResizing ? column.getSize() : undefined,
        }}
      >
        <div className={styles.headerLabel()}>
          {dnd && (
            <HeaderDragHandle
              attributes={dnd.attributes}
              label={
                typeof column.columnDef.header === "string"
                  ? column.columnDef.header
                  : column.id
              }
              listeners={dnd.listeners}
              setActivatorNodeRef={dnd.setActivatorNodeRef}
              styles={styles}
            />
          )}
          <HeaderSortLabel
            enableSorting={enableSorting}
            header={header}
            locked={locked}
            onBlocked={() => blocked("sort")}
            styles={styles}
          />
        </div>
        {enableColumnResizing && column.getCanResize() ? (
          <button
            aria-label={`Resize ${columnDisplayName(column)}`}
            className={styles.resizeHandle()}
            onDoubleClick={() => column.resetSize()}
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            type="button"
          />
        ) : null}
      </Table.ColumnHeader>
    )
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  const headerContent = (
    <Table.Header
      {...slotProps?.header}
      className={hideHeader ? "sr-only" : undefined}
    >
      {table.getHeaderGroups().map((headerGroup, groupIndex) => (
        <Table.Row
          key={headerGroup.id}
          ref={
            groupIndex === 0
              ? (headerRowRef as RefObject<HTMLTableRowElement>)
              : undefined
          }
        >
          {headerGroup.headers.map((header) => {
            const reorderable =
              enableColumnReorder &&
              !locked &&
              header.subHeaders.length === 0 &&
              !header.column.getIsPinned() &&
              !builtinIds.has(header.column.id)
            return reorderable ? (
              <SortableHeaderContent
                columnId={header.column.id}
                key={header.id}
              >
                {(dnd) => renderHeaderCell(header, dnd)}
              </SortableHeaderContent>
            ) : (
              renderHeaderCell(header)
            )
          })}
          {hasActionsColumn && groupIndex === 0 && (
            <Table.ColumnHeader
              className={stickyActions ? "sticky end-0" : undefined}
              numeric
              rowSpan={table.getHeaderGroups().length}
              style={{
                ...OPAQUE_HEADER_BG,
                ...(stickyActions
                  ? { zIndex: DATA_TABLE_Z.pinnedHeaderCell }
                  : undefined),
              }}
            >
              {translations.actionsLabel}
            </Table.ColumnHeader>
          )}
        </Table.Row>
      ))}

      {enableColumnFilters && (
        <tr
          aria-label={translations.filtersLabel}
          className={styles.filterRow()}
        >
          {leafColumns.map((column) => (
            <td
              className={`${styles.filterCell()} ${pinClass(column, "header") ?? ""}`}
              data-pinned={column.getIsPinned() || undefined}
              key={column.id}
              style={{
                ...OPAQUE_HEADER_BG,
                ...getPinningStyles(column, "header"),
                ...(stickyHeader
                  ? { position: "sticky", top: headerHeight }
                  : undefined),
                ...(column.getIsPinned() && stickyHeader
                  ? { zIndex: DATA_TABLE_Z.pinnedHeaderCell }
                  : undefined),
              }}
            >
              <div className={styles.filterControl()}>
                {column.getCanFilter() ? renderColumnFilter(column) : null}
              </div>
            </td>
          ))}
          {hasActionsColumn && (
            <td
              className={
                stickyActions
                  ? `${styles.filterCell()} sticky end-0 bg-table-header-bg`
                  : styles.filterCell()
              }
              style={{
                ...OPAQUE_HEADER_BG,
                ...(stickyHeader
                  ? {
                      position: "sticky",
                      top: headerHeight,
                      zIndex: DATA_TABLE_Z.pinnedHeaderCell,
                    }
                  : undefined),
              }}
            />
          )}
        </tr>
      )}
    </Table.Header>
  )

  /**
   * Resolve the inline editor for a cell, or `undefined` when the cell is not
   * currently editable. Per-column `meta.renderEditor` wins over the
   * table-wide `editorRenderers` override, which wins over the type default.
   */
  const renderCellEditor = (row: Row<T>, column: Column<T, unknown>) => {
    const meta = column.columnDef.meta
    if (!(enableInlineEdit && meta?.editable) || editingRowId !== row.id) {
      return
    }
    const type: DataTableColumnType = meta.type ?? "string"
    const ctx: DataTableEditorContext<T> = {
      row,
      column,
      type,
      value: draft[column.id],
      setValue: (next) => setDraftValue(row.id, column.id, next),
      disabled: false,
      size,
      options: meta.options ?? [],
      error: editErrors[column.id] || undefined,
      errorId: `${instanceId}-err-${row.id}-${column.id}`,
      commit: commitEdit,
      cancel: cancelEdit,
    }
    if (meta.renderEditor) {
      return meta.renderEditor(ctx)
    }
    const renderer =
      editorRenderers?.[type] ??
      (DEFAULT_EDITOR_RENDERERS[type] as DataTableEditorRenderer<T>)
    return renderer?.(ctx) ?? undefined
  }

  /** Edit/delete affordances used when no `renderRowActions` slot is given. */
  const defaultRowActions = (row: Row<T>) => {
    if (!enableInlineEdit) {
      return null
    }
    if (editingRowId === row.id) {
      return (
        <>
          <Button
            aria-label="Save row"
            icon="token-icon-check"
            onClick={(e) => {
              e.stopPropagation()
              commitEdit()
            }}
            size="sm"
            theme="borderless"
            variant="primary"
          />
          <Button
            aria-label="Cancel edit"
            icon="token-icon-close"
            onClick={(e) => {
              e.stopPropagation()
              cancelEdit()
            }}
            size="sm"
            theme="borderless"
            variant="secondary"
          />
        </>
      )
    }
    return (
      <ActionIcon
        aria-label={`Edit ${getRowLabel?.(row) ?? `row ${row.id}`}`}
        disabled={isEditing || (canEditRow ? !canEditRow(row) : false)}
        icon="icon-[mdi--pencil-outline]"
        id={`${instanceId}-edit-${row.id}`}
        onClick={(e) => {
          e.stopPropagation()
          startEdit(row)
        }}
        size={size}
        tone="neutral"
      />
    )
  }

  /** Row-level actions cell, optionally pinned to the right edge. */
  const renderActionsCell = (row: Row<T>) => (
    <Table.Cell
      className={stickyActions ? "sticky end-0 bg-table-bg" : undefined}
      numeric
    >
      <div className={styles.actionsCell()}>
        {enableExpanding && row.getCanExpand() ? (
          <Button
            aria-controls={`${instanceId}-detail-${row.id}`}
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
            icon={
              row.getIsExpanded()
                ? "token-icon-chevron-down"
                : "token-icon-chevron-right"
            }
            onClick={(e) => {
              e.stopPropagation()
              row.getToggleExpandedHandler()()
            }}
            size="sm"
            theme="borderless"
            variant="secondary"
          />
        ) : null}
        {rowActions?.map((action) =>
          action.hidden?.(row) ? null : (
            <Button
              aria-label={action.label}
              disabled={action.disabled?.(row) || isEditing}
              icon={action.icon}
              key={action.id}
              onClick={(e) => {
                e.stopPropagation()
                action.onAction(row)
              }}
              size="sm"
              theme="borderless"
              variant={action.tone === "danger" ? "danger" : "secondary"}
            />
          )
        )}
        {renderRowActions?.(row, {
          isEditing: editingRowId === row.id,
          startEdit: () => startEdit(row),
          commitEdit,
          cancelEdit,
          disabled: isEditing && editingRowId !== row.id,
        }) ?? defaultRowActions(row)}
      </div>
    </Table.Cell>
  )

  // Spread the passthrough first, then internal props, so DataTable's own click
  // handler, sortable ref and transform compose with (not get replaced by)
  // slotProps.row.
  const {
    onClick: rowOnClick,
    style: rowStyle,
    ref: rowRef,
    ...restRowProps
  } = slotProps?.row ?? {}

  /** One row's data cells, honouring cell spans and any active inline editor. */
  const renderRowCells = (
    row: Row<T>,
    cells: Cell<T, unknown>[],
    rowIndex: number,
    dnd?: { dragHandleProps: Record<string, unknown> }
  ) =>
    cells.map((cell) => {
      const span = getCellSpan?.(cell, { row, rows, rowIndex })
      if (span?.hidden) {
        return null
      }
      const column = cell.column as Column<T, unknown>
      return (
        <DataTableBodyCell
          cell={cell}
          dnd={dnd}
          editor={renderCellEditor(row, column)}
          editorError={
            editingRowId === row.id
              ? editErrors[column.id] || undefined
              : undefined
          }
          editorErrorId={`${instanceId}-err-${row.id}-${column.id}`}
          enableColumnResizing={enableColumnResizing}
          enableRowReorder={enableRowReorder}
          indentColumnId={indentColumnId}
          key={cell.id}
          row={row}
          rowLabel={getRowLabel?.(row) ?? `row ${row.id}`}
          span={span}
          styles={styles}
        />
      )
    })

  /* ── Body row renderer ──────────────────────────────────────────────── */
  const renderBodyRow = (
    row: Row<T>,
    rowIndex: number,
    dnd?: {
      setNodeRef: (node: HTMLElement | null) => void
      style: CSSProperties
      dragHandleProps: Record<string, unknown>
      isDragging?: boolean
      dropSide?: "top" | "bottom"
    }
  ) => {
    const cells = row.getVisibleCells()
    const rowIsClickable = !!onRowClick && !locked
    const actionsColumn = hasActionsColumn ? 1 : 0
    const rowKeyDown = rowIsClickable
      ? (event: React.KeyboardEvent<HTMLTableRowElement>) =>
          activateRowByKeyboard(event, () => {
            if (!blocked("rowClick")) {
              onRowClick?.(
                row,
                event as unknown as React.MouseEvent<HTMLTableRowElement>
              )
            }
          })
      : undefined

    const mainRow = (
      <Table.Row
        {...restRowProps}
        aria-rowindex={rowIndex + 1}
        className={rowDragClass(dnd, restRowProps.className, striped)}
        data-depth={row.depth || undefined}
        data-dragging={dnd?.isDragging || undefined}
        onClick={(event) => {
          if (blocked("rowClick")) {
            return
          }
          rowOnClick?.(event)
          onRowClick?.(row, event)
        }}
        onKeyDown={rowKeyDown}
        ref={composeRowRef(editingRowId === row.id, editRowRef, dnd, rowRef)}
        // Sortable ref wins while reordering; otherwise keep the consumer's ref.
        selected={enableRowSelection ? row.getIsSelected() : undefined}
        style={{ ...rowStyle, ...dnd?.style }}
        tabIndex={rowIsClickable ? 0 : undefined}
      >
        {renderRowCells(row, cells, rowIndex, dnd)}
        {hasActionsColumn && renderActionsCell(row)}
      </Table.Row>
    )

    const expandedRow =
      renderExpandedRow && row.getIsExpanded() ? (
        <tr>
          <td colSpan={columnCount + actionsColumn}>
            {renderExpandedRow(row)}
          </td>
        </tr>
      ) : null

    return (
      <Fragment key={row.id}>
        {mainRow}
        {expandedRow}
      </Fragment>
    )
  }

  // Row order only maps back to `data` while the view is unsorted/unfiltered.
  const rowReorderActive =
    enableRowReorder &&
    !locked &&
    sorting.length === 0 &&
    columnFilters.length === 0 &&
    !globalFilter

  const bodyRows = renderRows.map((row, i) => {
    // Under virtualization `renderRows` is a window; map back to the true index
    // in `rows` so getCellSpan inspects the correct neighbouring records.
    const rowIndex = enableVirtualization ? (virtualItems[i]?.index ?? i) : i
    // Only top-level rows are reorderable — sub-rows aren't in the top-level
    // `data` array, so dragging them could not be applied to it.
    return rowReorderActive && row.depth === 0 ? (
      <SortableRow enabled={enableRowReorder} key={row.id} row={row}>
        {(dnd) => renderBodyRow(row, rowIndex, dnd)}
      </SortableRow>
    ) : (
      renderBodyRow(row, rowIndex)
    )
  })

  const skeletonRows = (count: number, keyPrefix: string) =>
    Array.from({ length: count }, (_, i) => `${keyPrefix}-${i}`).map(
      (rowKey) => (
        <Table.Row aria-hidden="true" key={rowKey}>
          {leafColumns.map((column) => (
            <Table.Cell key={`${rowKey}-${column.id}`}>
              <Skeleton.Text noOfLines={1} size={size} />
            </Table.Cell>
          ))}
          {hasActionsColumn && (
            <Table.Cell numeric>
              <Skeleton.Text noOfLines={1} size={size} />
            </Table.Cell>
          )}
        </Table.Row>
      )
    )

  const emptyState = renderEmpty ? (
    renderEmpty()
  ) : (
    <div className={styles.empty()}>
      <Icon icon="icon-[mdi--table-off]" size="xl" />
      <div>
        <p>{translations.emptyTitle}</p>
        <p className="text-table-sm">{translations.emptyDescription}</p>
      </div>
    </div>
  )

  let statusMessage = ""
  if (loading) {
    statusMessage = translations.loadingLabel
  } else if (rows.length === 0) {
    statusMessage = translations.emptyTitle
  } else if (isEditing) {
    statusMessage = translations.editingLabel
  }

  const emptyRow = (
    <tr>
      <td colSpan={columnCount + (hasActionsColumn ? 1 : 0)}>{emptyState}</td>
    </tr>
  )

  let bodyState: "loading" | "empty" | "rows" = "rows"
  if (loading) {
    bodyState = "loading"
  } else if (rows.length === 0) {
    bodyState = "empty"
  }

  const bodyContent = (
    <Table.Body {...slotProps?.body}>
      {bodyState === "loading" && skeletonRows(loadingRowCount, "skeleton")}
      {bodyState === "empty" && emptyRow}
      {bodyState === "rows" && (
        <>
          {paddingTop > 0 && (
            <tr>
              <td
                colSpan={columnCount + (hasActionsColumn ? 1 : 0)}
                style={{ height: paddingTop }}
              />
            </tr>
          )}
          {bodyRows}
          {loadingMore && skeletonRows(1, "skeleton-more")}
          {paddingBottom > 0 && (
            <tr>
              <td
                colSpan={columnCount + (hasActionsColumn ? 1 : 0)}
                style={{ height: paddingBottom }}
              />
            </tr>
          )}
        </>
      )}
    </Table.Body>
  )

  const footerContent = hasFooter ? (
    <Table.Footer>
      {table.getFooterGroups().map((footerGroup) => (
        <Table.Row key={footerGroup.id}>
          {footerGroup.headers.map((header) => (
            <Table.Cell key={header.id}>
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.footer,
                    header.getContext()
                  )}
            </Table.Cell>
          ))}
          {hasActionsColumn && <Table.Cell numeric />}
        </Table.Row>
      ))}
    </Table.Footer>
  ) : null

  const tableEl = (
    <Table
      aria-busy={loading || loadingMore || undefined}
      aria-rowcount={table.getRowCount()}
      interactive={(interactive || !!onRowClick) && !locked}
      showColumnBorder={showColumnBorder}
      size={size}
      stickyHeader={stickyHeader}
      variant={variant}
      {...slotProps?.root}
    >
      {caption && <Table.Caption>{caption}</Table.Caption>}
      {headerContent}
      {bodyContent}
      {footerContent}
    </Table>
  )

  /* Wrap with dnd context when reorder is on. */
  let scrollBody: ReactNode = tableEl
  if (enableColumnReorder) {
    scrollBody = (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleColumnDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={reorderableLeafIds}
          strategy={horizontalListSortingStrategy}
        >
          {scrollBody}
        </SortableContext>
      </DndContext>
    )
  }
  if (rowReorderActive) {
    scrollBody = (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleRowDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={rows.filter((r) => r.depth === 0).map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          {scrollBody}
        </SortableContext>
      </DndContext>
    )
  }

  const ctxValue: DataTableContextValue<T> = {
    table,
    pageSizeOptions,
    translations,
    locked,
    blocked,
    size,
    paginationProps,
  }

  return (
    <DataTableContext.Provider
      value={ctxValue as DataTableContextValue<unknown>}
    >
      <div className={styles.wrapper({ className })} id={instanceId} ref={ref}>
        <output aria-live="polite" className="sr-only">
          {statusMessage}
        </output>
        {(enableGlobalFilter || enableColumnVisibility || renderToolbar) &&
          (renderToolbar ? (
            renderToolbar(table)
          ) : (
            <DataTable.Toolbar>
              {enableGlobalFilter && <DataTable.GlobalSearch />}
              {enableColumnVisibility && <DataTable.ColumnVisibility />}
            </DataTable.Toolbar>
          ))}
        <div
          className={styles.scroll()}
          onScroll={handleScroll}
          ref={scrollRef}
          style={maxHeight ? { maxHeight } : undefined}
        >
          {scrollBody}
        </div>
        {enablePagination && <DataTable.Pagination />}
      </div>
    </DataTableContext.Provider>
  )
}

/* ── Built-in leading columns ────────────────────────────────────────────── */

function buildColumns<T>({
  userColumns,
  enableRowReorder,
  enableRowSelection,
  locked,
  getRowLabel,
  selectAllLabel,
  showSelectAll,
  onBlockedSelect,
}: {
  userColumns: ColumnDef<T, unknown>[]
  enableRowReorder: boolean
  enableRowSelection: boolean
  locked: boolean
  getRowLabel?: (row: Row<T>) => string
  selectAllLabel: string
  showSelectAll: boolean
  onBlockedSelect: () => void
}): ColumnDef<T, unknown>[] {
  const leading: ColumnDef<T, unknown>[] = []

  if (enableRowReorder) {
    leading.push({
      id: DRAG_COLUMN_ID,
      header: () => null,
      // Cell body is replaced by the drag handle in renderBodyRow.
      cell: () => null,
      enableSorting: false,
      enableColumnFilter: false,
      size: 40,
    })
  }

  if (enableRowSelection) {
    leading.push({
      id: SELECTION_COLUMN_ID,
      header: ({ table }) =>
        showSelectAll ? (
          <Checkbox
            aria-label={selectAllLabel}
            checked={table.getIsAllRowsSelected()}
            disabled={locked}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ) : null,
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${getRowLabel?.(row) ?? `row ${row.id}`}`}
          checked={row.getIsSelected()}
          disabled={locked || !row.getCanSelect()}
          indeterminate={row.getIsSomeSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => {
            e.stopPropagation()
            if (locked) {
              onBlockedSelect()
            }
          }}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 44,
    })
  }

  return [...leading, ...userColumns]
}

/* ── Composable sub-components ────────────────────────────────────────────── */

DataTable.Toolbar = function DataTableToolbar({
  children,
}: {
  children: ReactNode
}) {
  const styles = dataTableVariants()
  return (
    <div className={styles.toolbar()}>
      <div className={styles.toolbarStart()}>{children}</div>
    </div>
  )
}

DataTable.GlobalSearch = function DataTableGlobalSearch({
  className,
}: {
  className?: string
}) {
  const { table, translations, locked, blocked, size } = useDataTableContext()
  return (
    <Input
      aria-label="Search"
      className={className}
      disabled={locked}
      onChange={(e) => {
        if (blocked("globalFilter")) {
          return
        }
        table.setGlobalFilter(e.target.value)
      }}
      placeholder={translations.searchPlaceholder}
      size={size}
      type="search"
      value={(table.getState().globalFilter as string) ?? ""}
    />
  )
}

DataTable.ColumnVisibility = function DataTableColumnVisibility() {
  const { table, translations, blocked, size } = useDataTableContext()
  const hideableColumns = table
    .getAllLeafColumns()
    .filter(
      (c) =>
        c.getCanHide() &&
        ![SELECTION_COLUMN_ID, EXPANDER_COLUMN_ID, DRAG_COLUMN_ID].includes(
          c.id
        )
    )

  const items: MenuItem[] = hideableColumns.map((column) => ({
    type: "checkbox",
    value: column.id,
    label:
      typeof column.columnDef.header === "string"
        ? column.columnDef.header
        : column.id,
    checked: column.getIsVisible(),
  }))

  return (
    <Menu
      items={items}
      onCheckedChange={(item) => {
        if (item.type === "checkbox" && !blocked("columnVisibility")) {
          table.getColumn(item.value)?.toggleVisibility()
        }
      }}
      size={size}
      triggerIcon="icon-[mdi--view-column]"
      triggerText={translations.columnsLabel}
    />
  )
}

DataTable.Pagination = function DataTablePagination() {
  const {
    table,
    pageSizeOptions,
    translations,
    locked,
    blocked,
    size,
    paginationProps,
  } = useDataTableContext()
  const state = table.getState().pagination
  const total = table.getRowCount()
  const start = total === 0 ? 0 : state.pageIndex * state.pageSize + 1
  const end = Math.min((state.pageIndex + 1) * state.pageSize, total)
  const styles = dataTableVariants()

  const pageSizeItems: SelectItem[] = pageSizeOptions.map((n) => ({
    label: String(n),
    value: String(n),
  }))

  return (
    <div className={styles.paginationBar()} style={OPAQUE_HEADER_BG}>
      <div className={styles.paginationControls()}>
        <span className={styles.paginationInfo()}>
          {translations.pageSizeLabel}
        </span>
        <DataTableSelect
          aria-label={translations.pageSizeLabel}
          disabled={locked}
          items={pageSizeItems}
          onValueChange={(v) => {
            if (!blocked("paginate")) {
              table.setPageSize(Number(v))
            }
          }}
          size={size}
          value={String(state.pageSize)}
        />
      </div>
      <div className={styles.paginationControls()}>
        <Pagination
          getPageUrl={() => "#"}
          size={size}
          {...paginationProps}
          count={total}
          onPageChange={(page) => {
            if (!blocked("paginate")) {
              table.setPageIndex(page - 1)
            }
          }}
          page={state.pageIndex + 1}
          pageSize={state.pageSize}
        />
        <span className={styles.paginationInfo()}>
          {translations.rangeLabel({ start, end, total })}
        </span>
      </div>
    </div>
  )
}

DataTable.displayName = "DataTable"
