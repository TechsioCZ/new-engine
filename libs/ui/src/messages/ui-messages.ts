/**
 * Every word @techsio/ui-kit shows or announces on its own: visible defaults, accessible names,
 * screen-reader announcements and validation messages. The kit ships English (`enUiMessages`);
 * an app in another language passes its catalog to `UiMessagesProvider` once, and every
 * component below it reads that language. A prop passed to one component still wins over the
 * catalog, so existing per-instance texts keep working.
 *
 * Messages that include a value are functions, so a translation can order words its own way.
 * The `translations` entries are zag-js machine labels; left unset, zag's English applies.
 *
 * This module is plain data and types, safe to import from server code.
 */
import type { IntlTranslations as CarouselIntlTranslations } from "@zag-js/carousel"
import type { IntlTranslations as ComboboxIntlTranslations } from "@zag-js/combobox"
import type { IntlTranslations as DatePickerIntlTranslations } from "@zag-js/date-picker"
import type { IntlTranslations as FileUploadIntlTranslations } from "@zag-js/file-upload"
import type { IntlTranslations as NumberInputIntlTranslations } from "@zag-js/number-input"
import type { IntlTranslations as PaginationIntlTranslations } from "@zag-js/pagination"
import type { IntlTranslations as PopoverIntlTranslations } from "@zag-js/popover"
import type { IntlTranslations as RatingIntlTranslations } from "@zag-js/rating-group"
import type { IntlTranslations as SelectIntlTranslations } from "@zag-js/select"
import type { IntlTranslations as TabsIntlTranslations } from "@zag-js/tabs"
import type { IntlTranslations as TourIntlTranslations } from "@zag-js/tour"
import type { IntlTranslations as TreeViewIntlTranslations } from "@zag-js/tree-view"

/** The parts of a date or time a DatePicker announces by name. */
export type UiDateSegment =
  | "era"
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "dayPeriod"
  | "timeZoneName"

export type DataTableMessages = {
  /** Accessible name of the keyboard-scrollable region when no caption is present. */
  scrollLabel: string
  searchPlaceholder: string
  /** Accessible name of the global search input. */
  searchLabel: string
  /** Accessible name of the search field's clear button. */
  clearSearchLabel: string
  /** Accessible name of the search submit button joined to the input. */
  searchButtonLabel: string
  columnsLabel: string
  emptyTitle: string
  emptyDescription: string
  pageSizeLabel: string
  actionsLabel: string
  filtersLabel: string
  selectAllLabel: string
  /** Accessible name of the selection column without a select-all control. */
  selectionLabel: string
  /** Accessible name of the row-reordering column header. */
  reorderLabel: string
  loadingLabel: string
  /** Text and date filter condition labels, keyed by operator (`contains`, `between`, `empty`, …). */
  operatorLabels: Partial<Record<string, string>>
  /** Number filter condition labels, keyed by operator (`equals`, `gt`, `between`, …). */
  numberOperatorLabels: Partial<Record<string, string>>
  /** A row's name when the table has no `getRowLabel`; receives the row id. */
  rowFallbackLabel: (rowId: string) => string
  editingLabel: string
  rangeLabel: (info: { start: number; end: number; total: number }) => string
  pageLabel: (info: { page: number; pageCount?: number }) => string
  previousPageLabel: string
  nextPageLabel: string
  paginationPendingLabel: string
  invalidRangeLabel: string
  savePendingLabel: string
  saveErrorLabel: string
  /** Inline-edit validation error for a blank `meta.required` field. */
  requiredLabel: string
  /** Accessible name of a row's selection checkbox; receives `getRowLabel` output. Keep the function stable. */
  selectRowLabel: (rowLabel: string) => string
  /** Accessible name of a row's inline-edit button; receives `getRowLabel` output. */
  editRowLabel: (rowLabel: string) => string
  /** Accessible name of a row's or column's drag handle. */
  dragHandleLabel: (label: string) => string
  /** Keyboard instructions screen readers read for a drag handle. */
  reorderInstructions: string
  reorderPickedUp: (info: { label: string; position: number }) => string
  reorderMoving: (info: {
    label: string
    target: string
    side: "before" | "after"
  }) => string
  reorderDropped: (info: { label: string; position: number }) => string
  reorderCanceled: (label: string) => string
  /** Accessible name and keyboard hint of a column's resize handle. */
  resizeColumnLabel: (column: string) => string
  resizeColumnDescription: string
  cancelEditLabel: string
  saveRowLabel: string
  expandRowLabel: string
  collapseRowLabel: string
  /** Header filter controls; `column` is the column's label. */
  filterLabel: (column: string) => string
  filterConditionLabel: (column: string) => string
  filterConditionValueLabel: (info: {
    column: string
    condition: string
  }) => string
  filterValueLabel: (column: string) => string
  filterUpperBoundLabel: (column: string) => string
  filterFromLabel: (column: string) => string
  filterToLabel: (column: string) => string
  filterValuePlaceholder: string
  filterFromPlaceholder: string
  filterToPlaceholder: string
  /** The option that clears a select or boolean filter. */
  filterAllLabel: string
  booleanTrueLabel: string
  booleanFalseLabel: string
  /** Inline editors; `column` is the column's label. */
  editCellLabel: (column: string) => string
  editCellFromLabel: (column: string) => string
  editCellToLabel: (column: string) => string
}

export type UiMessages = {
  /** BCP 47 locale for number, date and time formatting where a component formats on its own. */
  locale?: string
  label: {
    /** Read after a required field's label; "" reads nothing. */
    required: string
  }
  skeleton: { loading: string }
  rating: {
    label: string
    averageDescription: string
    valueText: (info: {
      label?: string
      value: number
      count: number
    }) => string
    /** Accessible name of the checked rating item. */
    itemValueText: (value: number) => string
    translations?: Partial<RatingIntlTranslations>
  }
  numericInput: { translations?: Partial<NumberInputIntlTranslations> }
  accordion: Record<never, never>
  carousel: { translations?: Partial<CarouselIntlTranslations> }
  cascadeSelect: {
    placeholder: string
    clear: string
    rootLabel: string
  }
  chart: {
    dataTableLabel: string
    emptyLabel: string
    invalidLabel: string
    seriesHeader: string
    categoryHeader: string
    valueHeader: string
  }
  colorSelect: {
    label: string
    selectColor: (color: string) => string
    readOnly: string
  }
  combobox: {
    placeholder: string
    /** `{inputValue}` is replaced with what the user typed. */
    noResults: string
    loading: string
    retry: string
    clear: string
    /** Native validation message of a required combobox left empty. */
    chooseSuggestion: string
    selectedValues: string
    /** Screen-reader status of a multiple combobox; receives the selected labels joined. */
    selectedStatus: (selected: string) => string
    removeValue: (value: string) => string
    translations?: Partial<ComboboxIntlTranslations>
  }
  datePicker: {
    segments: Record<UiDateSegment, string>
    /** Read for a segment with no value yet. */
    emptySegment: string
    incompleteValue: string
    unavailableValue: string
    outOfRange: (info: { min?: string; max?: string }) => string
    start: string
    end: string
    time: string
    startTime: string
    endTime: string
    startAndEndTimes: string
    dayPeriod: string
    am: string
    pm: string
    /** Accessible name of a labelled field's day-period part. */
    dayPeriodOf: (field: string) => string
    cancel: string
    confirm: string
    translations?: Partial<DatePickerIntlTranslations>
  }
  dialog: { open: string; close: string }
  drawer: { close: string }
  fileUpload: {
    processingFailed: string
    readOnly: string
    clear: string
    translations?: Partial<FileUploadIntlTranslations>
  }
  formErrorSummary: { title: string }
  menu: { trigger: string }
  pagination: {
    /** Shown while a requested page is out of range and a valid one is chosen. */
    unavailable: string
    /** Compact pagination text. */
    compact: (info: { page: number; totalPages: number }) => string
    translations?: Partial<PaginationIntlTranslations>
  }
  phoneInput: {
    placeholder: string
    invalid: string
    /** Country names by ISO 3166-1 alpha-2 code. */
    countries: Partial<Record<string, string>>
  }
  popover: {
    close: string
    /** Accessible name of the popover template's icon trigger. */
    details: string
    translations?: Partial<PopoverIntlTranslations>
  }
  searchForm: {
    placeholder: string
    search: string
    clear: (query: string) => string
  }
  select: {
    placeholder: string
    clear: string
    readOnly: string
    translations?: Partial<SelectIntlTranslations>
  }
  steps: { progress: string; complete: string }
  tabs: { translations?: Partial<TabsIntlTranslations> }
  toast: {
    close: string
    /** Title of a loading toast without its own title. */
    loading: string
  }
  tour: {
    guidance: string
    translations?: Partial<TourIntlTranslations>
  }
  treeView: {
    expand: (name: string) => string
    collapse: (name: string) => string
    translations?: Partial<TreeViewIntlTranslations>
  }
  dataTable: DataTableMessages
  gallery: {
    images: string
    showSlide: (index: number) => string
  }
  header: { toggleMenu: string }
  facetFilterPanel: {
    activeFilters: string
    reset: string
    showMore: (hiddenCount: number) => string
    showLess: string
    /** Slider thumb names; receive the group's label as written. */
    minimum: (group: string) => string
    maximum: (group: string) => string
  }
  productCard: {
    originalPrice: string
    currentPrice: string
    addToCart: string
    viewDetails: string
    addToWishlist: string
  }
  themeToggle: {
    brand: string
    mode: string
    light: string
    dark: string
    system: string
  }
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

/** What an app passes: any subset of the catalog. Missing entries fall back to the outer catalog, then English. */
export type UiMessagesInput = DeepPartial<UiMessages>

export const enUiMessages: UiMessages = {
  label: { required: "(required)" },
  skeleton: { loading: "Loading content" },
  rating: {
    label: "Rating",
    averageDescription: "Average rating",
    valueText: ({ label, value, count }) =>
      `${label ? `${label}: ` : ""}${value} out of ${count}`,
    itemValueText: (value) => `${value} stars`,
  },
  numericInput: {},
  accordion: {},
  carousel: {},
  cascadeSelect: {
    placeholder: "Select an option",
    clear: "Clear selection",
    rootLabel: "Options",
  },
  chart: {
    dataTableLabel: "View chart data",
    emptyLabel: "No data to display.",
    invalidLabel:
      "Pie and donut values must be finite, non-negative numbers with a positive total.",
    seriesHeader: "Series",
    categoryHeader: "Category",
    valueHeader: "Value",
  },
  colorSelect: {
    label: "Color",
    selectColor: (color) => `Select color ${color}`,
    readOnly: "Read-only color selection",
  },
  combobox: {
    placeholder: "Select option",
    noResults: 'No results found for "{inputValue}"',
    loading: "Loading results",
    retry: "Retry",
    clear: "Clear value",
    chooseSuggestion: "Select an option from the suggestions.",
    selectedValues: "Selected values",
    selectedStatus: (selected) => `Selected: ${selected}`,
    removeValue: (value) => `Remove ${value}`,
  },
  datePicker: {
    segments: {
      era: "Era",
      year: "Year",
      month: "Month",
      day: "Day",
      hour: "Hour",
      minute: "Minute",
      second: "Second",
      dayPeriod: "AM/PM",
      timeZoneName: "Time zone",
    },
    emptySegment: "Empty",
    incompleteValue: "Complete every date and time segment before submitting.",
    unavailableValue: "Complete an available date and time.",
    outOfRange: ({ min, max }) =>
      `Choose an available date and time${min ? ` on or after ${min}` : ""}${max ? ` on or before ${max}` : ""}.`,
    start: "Start",
    end: "End",
    time: "Time",
    startTime: "Start time",
    endTime: "End time",
    startAndEndTimes: "Start and end times",
    dayPeriod: "Day period",
    am: "AM",
    pm: "PM",
    dayPeriodOf: (field) => `${field} day period`,
    cancel: "Cancel",
    confirm: "Confirm",
  },
  dialog: { open: "Open", close: "Close dialog" },
  drawer: { close: "Close drawer" },
  fileUpload: {
    processingFailed:
      "Files could not be processed. Choose the files again to retry.",
    readOnly: "Read-only files. Uploading and removing files is unavailable.",
    clear: "Clear files",
  },
  formErrorSummary: { title: "There is a problem" },
  menu: { trigger: "Menu" },
  pagination: {
    unavailable: "Page unavailable. Choose a page within the current results.",
    compact: ({ page, totalPages }) => `${page} of ${totalPages}`,
  },
  phoneInput: {
    placeholder: "Phone number",
    invalid: "Enter a valid phone number.",
    countries: {
      SK: "Slovakia",
      CZ: "Czechia",
      HU: "Hungary",
      RO: "Romania",
      PL: "Poland",
      AT: "Austria",
      DE: "Germany",
    },
  },
  popover: { close: "Close popover", details: "Additional details" },
  searchForm: {
    placeholder: "Search...",
    search: "Search",
    clear: (query) => `Clear search: ${query}`,
  },
  select: {
    placeholder: "Select an option",
    clear: "Clear selection",
    readOnly: "Read-only selection",
  },
  steps: { progress: "Step progress", complete: "Workflow complete" },
  tabs: {},
  toast: { close: "Close notification", loading: "loading..." },
  tour: { guidance: "Tour guidance" },
  treeView: {
    expand: (name) => `Expand ${name}`,
    collapse: (name) => `Collapse ${name}`,
  },
  dataTable: {
    scrollLabel: "Scrollable records",
    searchPlaceholder: "Search…",
    searchLabel: "Search",
    clearSearchLabel: "Clear search",
    searchButtonLabel: "Submit search",
    columnsLabel: "Column settings",
    emptyTitle: "No records",
    emptyDescription: "There is no data to display.",
    pageSizeLabel: "Rows per page",
    actionsLabel: "Actions",
    filtersLabel: "Column filters",
    selectAllLabel: "Select all rows",
    selectionLabel: "Select rows",
    reorderLabel: "Reorder rows",
    loadingLabel: "Loading data",
    operatorLabels: {
      contains: "Contains",
      notContains: "Does not contain",
      equals: "Equals",
      notEquals: "Does not equal",
      startsWith: "Starts with",
      endsWith: "Ends with",
      empty: "Is empty",
      notEmpty: "Is not empty",
      between: "Between",
    },
    numberOperatorLabels: {
      equals: "=",
      notEquals: "≠",
      gt: ">",
      gte: "≥",
      lt: "<",
      lte: "≤",
      between: "Between",
      empty: "Is empty",
      notEmpty: "Is not empty",
    },
    rowFallbackLabel: (rowId) => `row ${rowId}`,
    editingLabel: "Editing a row — other table controls are locked",
    rangeLabel: ({ start, end, total }) => `${start}–${end} of ${total}`,
    pageLabel: ({ page, pageCount }) =>
      pageCount == null ? `Page ${page}` : `Page ${page} of ${pageCount}`,
    previousPageLabel: "Previous page",
    nextPageLabel: "Next page",
    paginationPendingLabel: "Page unavailable — requesting an available page.",
    invalidRangeLabel: "Enter valid dates with the start on or before the end.",
    savePendingLabel: "Saving row…",
    saveErrorLabel:
      "Could not save this row. Your changes are kept; try Save again.",
    requiredLabel: "Enter a value before saving this row.",
    selectRowLabel: (rowLabel) => `Select ${rowLabel}`,
    editRowLabel: (rowLabel) => `Edit ${rowLabel}`,
    dragHandleLabel: (label) => `Drag to reorder ${label}`,
    reorderInstructions:
      "To reorder, focus a drag handle and press Space or Enter. " +
      "Use Up and Down for rows, or Left and Right for columns. " +
      "Press Space or Enter to drop, or Escape to cancel.",
    reorderPickedUp: ({ label, position }) =>
      `Picked up ${label}, position ${position}.`,
    reorderMoving: ({ label, target, side }) =>
      `${label} will move ${side} ${target}.`,
    reorderDropped: ({ label, position }) =>
      `Dropped ${label}, position ${position}.`,
    reorderCanceled: (label) => `Reordering ${label} canceled.`,
    resizeColumnLabel: (column) => `Resize ${column}`,
    resizeColumnDescription:
      "Use Left and Right arrows to resize; Shift changes by 50 pixels. Enter resets the width.",
    cancelEditLabel: "Cancel edit",
    saveRowLabel: "Save row",
    expandRowLabel: "Expand row",
    collapseRowLabel: "Collapse row",
    filterLabel: (column) => `Filter ${column}`,
    filterConditionLabel: (column) => `Filter condition for ${column}`,
    filterConditionValueLabel: ({ column, condition }) =>
      `Filter condition for ${column}: ${condition}`,
    filterValueLabel: (column) => `Filter value for ${column}`,
    filterUpperBoundLabel: (column) => `Filter upper bound for ${column}`,
    filterFromLabel: (column) => `Filter ${column} from`,
    filterToLabel: (column) => `Filter ${column} to`,
    filterValuePlaceholder: "Value",
    filterFromPlaceholder: "From",
    filterToPlaceholder: "To",
    filterAllLabel: "All",
    booleanTrueLabel: "Yes",
    booleanFalseLabel: "No",
    editCellLabel: (column) => `Edit ${column}`,
    editCellFromLabel: (column) => `Edit ${column} from`,
    editCellToLabel: (column) => `Edit ${column} to`,
  },
  gallery: {
    images: "Product images",
    showSlide: (index) => `Show slide ${index}`,
  },
  header: { toggleMenu: "Toggle mobile menu" },
  facetFilterPanel: {
    activeFilters: "Active filters",
    reset: "Clear filters",
    showMore: (hiddenCount) => `Show ${hiddenCount} more`,
    showLess: "Show less",
    minimum: (group) => `Minimum ${group.toLocaleLowerCase()}`,
    maximum: (group) => `Maximum ${group.toLocaleLowerCase()}`,
  },
  productCard: {
    originalPrice: "Original price",
    currentPrice: "Current price",
    addToCart: "Add to Cart",
    viewDetails: "View Details",
    addToWishlist: "Add to Wishlist",
  },
  themeToggle: {
    brand: "Brand",
    mode: "Mode",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function mergeInto(
  base: Record<string, unknown>,
  input: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue
    }
    const current = merged[key]
    merged[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeInto(current, value)
        : value
  }
  return merged
}

/**
 * A `translations` prop without its undefined entries, for layering over the catalog's: an entry
 * left undefined (a lookup that missed) keeps the catalog's text instead of dropping to zag's English.
 */
export function definedEntries<T extends object>(
  value: T | undefined
): Partial<T> {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>
}

/** Layers a partial catalog over a complete one; `undefined` entries keep the base text. */
export function mergeUiMessages(
  base: UiMessages,
  input: UiMessagesInput | undefined
): UiMessages {
  if (!input) {
    return base
  }
  return mergeInto(
    base as unknown as Record<string, unknown>,
    input as Record<string, unknown>
  ) as unknown as UiMessages
}
