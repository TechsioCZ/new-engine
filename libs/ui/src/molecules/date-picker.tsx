/**
 * DatePicker — @techsio/ui-kit molecule.
 *
 * @component DatePicker
 * @componentVersion v1.3.6
 * @skill date-picker-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import type {
  CalendarDate,
  CalendarDateTime,
  DateValue,
  ZonedDateTime,
} from "@internationalized/date"
import {
  connect as connectDateInput,
  type Api as DateInputApi,
} from "@zag-js/date-input"
import {
  connect as connectDatePicker,
  machine as datePickerMachine,
  type PositioningOptions,
  type Api as ZagDatePickerApi,
} from "@zag-js/date-picker"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from "react"
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import { Button, type ButtonProps } from "../atoms/button"
import { Input } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText, type StatusTextProps } from "../atoms/status-text"
import {
  canConfirmDatePickerDraft,
  createDatePickerCoordinatorState,
  type DatePickerCandidate,
  type DatePickerCandidateIndex,
  type DatePickerCoordinatorState,
  type DatePickerDraftTimePart,
  datePickerCoordinatorReducer,
  getDatePickerDraftTimeParts,
  isDatePickerCandidateAllowed,
} from "../internal/date-picker-coordinator"
import {
  composeDatePickerRefs,
  formatDatePickerCalendar,
  getDatePickerCalendarDate,
  normalizeDatePickerDigits,
  normalizeDatePickerTimeZone,
} from "../internal/date-picker-dom"
import { datePickerInputMachine } from "../internal/date-picker-input"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import { subscribeOwnerFormReset } from "../internal/form-control-lifecycle"
import {
  OverlayPortal as Portal,
  restoreFocusAfterOverlayClose,
} from "../internal/overlay-portal"
import { useEffectiveDisabled } from "../internal/use-effective-disabled"
import { tv } from "../utils"

export type DatePickerGranularity = "day" | "hour" | "minute" | "second"
export type DatePickerSelectionMode = "single" | "range"
export type DatePickerSize = "sm" | "md" | "lg"
export type DatePickerTimedValue = CalendarDateTime | ZonedDateTime
export type DatePickerRange<T> = readonly [T, T]
export type DatePickerTimedRange =
  | DatePickerRange<CalendarDateTime>
  | DatePickerRange<ZonedDateTime>
type DatePickerPublicValue = DateValue | DatePickerRange<DateValue>

export type DatePickerValueChangeDetails<T extends DatePickerPublicValue> = {
  value: T | null
  valueAsString: T extends DatePickerRange<DateValue>
    ? DatePickerRange<string>
    : string
}

export type DatePickerOpenChangeDetails = {
  open: boolean
}

type DatePickerCommonRootProps<T extends DatePickerPublicValue> = Omit<
  ComponentPropsWithoutRef<"div">,
  "defaultValue" | "onChange"
> & {
  children: ReactNode
  defaultOpen?: boolean
  defaultValue?: T | null
  disabled?: boolean
  flip?: PositioningOptions["flip"]
  form?: string
  gutter?: PositioningOptions["gutter"]
  hideTimeZone?: boolean
  hourCycle?: 12 | 24
  invalid?: boolean
  isDateUnavailable?: (date: DateValue, locale: string) => boolean
  locale?: string
  max?: DateValue
  min?: DateValue
  offset?: PositioningOptions["offset"]
  onOpenChange?: (details: DatePickerOpenChangeDetails) => void
  onValueChange?: (details: DatePickerValueChangeDetails<T>) => void
  open?: boolean
  overflowPadding?: PositioningOptions["overflowPadding"]
  placement?: PositioningOptions["placement"]
  readOnly?: boolean
  ref?: Ref<HTMLDivElement>
  required?: boolean
  sameWidth?: PositioningOptions["sameWidth"]
  shouldForceLeadingZeros?: boolean
  size?: DatePickerSize
  slide?: PositioningOptions["slide"]
  startOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  timeZone?: string
  value?: T | null
}

type DatePickerSingleRootFields = {
  endName?: never
  name?: string
  numOfMonths?: number
  selectionMode?: "single"
  startName?: never
}

type DatePickerRangeRootFields = {
  endName?: string
  name?: never
  numOfMonths?: number
  selectionMode: "range"
  startName?: string
}

export type DatePickerDayRootProps = DatePickerCommonRootProps<CalendarDate> &
  DatePickerSingleRootFields & {
    granularity?: "day"
    isTimeUnavailable?: never
  }

export type DatePickerTimedRootProps =
  DatePickerCommonRootProps<DatePickerTimedValue> &
    DatePickerSingleRootFields & {
      granularity: Exclude<DatePickerGranularity, "day">
      isTimeUnavailable?: (value: DatePickerTimedValue) => boolean
    }

export type DatePickerDayRangeRootProps = DatePickerCommonRootProps<
  DatePickerRange<CalendarDate>
> &
  DatePickerRangeRootFields & {
    granularity?: "day"
    isTimeUnavailable?: never
  }

export type DatePickerTimedRangeRootProps =
  DatePickerCommonRootProps<DatePickerTimedRange> &
    DatePickerRangeRootFields & {
      granularity: Exclude<DatePickerGranularity, "day">
      isTimeUnavailable?: (value: DatePickerTimedValue, index: 0 | 1) => boolean
    }

export type DatePickerRangeRootProps =
  | DatePickerDayRangeRootProps
  | DatePickerTimedRangeRootProps

export type DatePickerRootProps =
  | DatePickerDayRootProps
  | DatePickerTimedRootProps
  | DatePickerRangeRootProps

export type DatePickerProps = DatePickerRootProps

const DATE_PICKER_ASCII_DIGIT = /[0-9]/

const DEFAULT_DATE_PICKER_MONTHS = { single: 1, range: 2 } as const

const datePickerVariants = tv({
  slots: {
    root: "relative flex w-full flex-col gap-date-picker-root",
    label: "text-date-picker-label-fg",
    control: "date-picker-field-container w-full",
    inputControl: [
      "form-control-base date-picker-range-control flex w-full items-center gap-date-picker-control",
      "border-(length:--border-width-date-picker-control)",
      "border-date-picker-control-border bg-date-picker-control-bg text-date-picker-control-fg",
      "hover:border-date-picker-control-border-hover hover:bg-date-picker-control-bg-hover",
      "data-focus:border-date-picker-control-border-focus data-focus:bg-date-picker-control-bg-focus",
      "has-focus-visible:outline-(style:--default-ring-style) has-focus-visible:outline-(length:--default-ring-width)",
      "has-focus-visible:outline-date-picker-control-ring",
      "has-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-date-picker-control-border-error",
      "data-[validation=error]:hover:border-date-picker-control-border-error-hover",
      "data-focus:data-[validation=error]:border-date-picker-control-border-error-focus",
      "data-disabled:cursor-not-allowed data-disabled:border-date-picker-control-border-disabled",
      "data-disabled:bg-date-picker-control-bg-disabled data-disabled:text-date-picker-control-fg-disabled",
      "form-control-readonly",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    segments: [
      "date-picker-range-segments flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden outline-hidden",
      "data-disabled:overflow-hidden",
    ],
    segmentGroup: "flex min-w-max shrink-0 items-center",
    rangeLabel: "date-picker-range-label",
    rangeSeparator:
      "shrink-0 px-date-picker-range-separator text-date-picker-range-separator-fg",
    segment: [
      "date-picker-segment-size inline-flex shrink-0 items-center justify-center rounded-date-picker-day px-date-picker-segment tabular-nums outline-hidden",
      "data-placeholder-shown:text-date-picker-segment-fg-placeholder",
      "focus:bg-date-picker-segment-bg-focus",
      "data-placeholder-shown:focus:text-date-picker-segment-fg-placeholder-focus",
      "data-[type=literal]:min-h-0 data-[type=literal]:min-w-0 data-[type=literal]:px-0 data-[type=literal]:text-date-picker-control-fg",
      "data-disabled:cursor-not-allowed data-readonly:cursor-default",
    ],
    indicatorGroup: "flex shrink-0 items-center gap-date-picker-indicator",
    trigger: [
      "inline-flex shrink-0 items-center justify-center rounded-date-picker-day border-0 p-0",
      "bg-date-picker-trigger-bg text-date-picker-trigger-fg",
      "hover:bg-date-picker-trigger-bg-hover",
      "active:bg-date-picker-trigger-bg-active",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-date-picker-trigger-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-disabled:cursor-not-allowed data-disabled:text-date-picker-trigger-fg-disabled",
      "disabled:cursor-not-allowed disabled:bg-date-picker-control-bg-disabled disabled:text-date-picker-trigger-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    clearTrigger: [
      "inline-flex shrink-0 items-center justify-center rounded-date-picker-day p-0",
      "text-date-picker-trigger-fg hover:bg-date-picker-trigger-bg-hover active:bg-date-picker-trigger-bg-active",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-date-picker-trigger-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-disabled:cursor-not-allowed data-disabled:text-date-picker-trigger-fg-disabled",
      "data-readonly:hidden",
      "disabled:cursor-not-allowed disabled:text-date-picker-trigger-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    positioner: "popup-layer isolate",
    content: [
      "popup-layer flex max-h-(--available-height) w-date-picker-content max-w-date-picker-viewport flex-col overflow-hidden",
      "data-[selection-mode=range]:w-date-picker-content-range",
      "border-(length:--border-width-date-picker-content) border-date-picker-content-border",
      "rounded-date-picker-content bg-date-picker-content-bg text-date-picker-content-fg shadow-date-picker-content",
      "outline-hidden duration-200 ease-out",
      "motion-safe:transition motion-reduce:transition-none",
      "starting:-translate-y-date-picker-enter-offset starting:opacity-0",
    ],
    calendar: [
      "grid min-h-0 grid-cols-1 gap-date-picker-calendar overflow-y-auto p-date-picker-content",
      "sm:data-[selection-mode=range]:grid-cols-2",
    ],
    monthPanel: [
      "grid min-w-0 content-start gap-date-picker-calendar",
      "sm:data-[index=1]:border-date-picker-month-divider-border sm:data-[index=1]:border-s sm:data-[index=1]:ps-date-picker-content",
    ],
    view: "min-w-0",
    viewControl:
      "flex min-w-0 items-center justify-between gap-date-picker-calendar",
    navigationTrigger: [
      "size-date-picker-navigation shrink-0 rounded-date-picker-day p-0 rtl:rotate-180",
      "text-date-picker-navigation-fg hover:bg-date-picker-navigation-bg-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-date-picker-navigation-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "disabled:cursor-not-allowed disabled:text-date-picker-navigation-fg-disabled",
    ],
    viewTrigger: [
      "min-w-0 flex-1 truncate rounded-date-picker-day px-date-picker-calendar-cell",
      "font-date-picker-view text-date-picker-navigation-fg hover:bg-date-picker-navigation-bg-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-date-picker-navigation-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    viewHeading:
      "min-w-0 flex-1 truncate px-date-picker-calendar-cell text-center font-date-picker-view text-date-picker-navigation-fg",
    table: "w-full table-fixed border-separate border-spacing-0",
    tableHeader: [
      "text-center align-middle",
      "font-date-picker-weekday text-date-picker-weekday text-date-picker-weekday-fg",
    ],
    tableCell: "p-0 text-center align-middle",
    dayTrigger: [
      "border-(length:--border-width-date-picker-day) flex w-full items-center justify-center",
      "rounded-date-picker-day border-date-picker-day-border bg-date-picker-day-bg text-date-picker-day-fg",
      "hover:bg-date-picker-day-bg-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-date-picker-day-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-today:border-date-picker-day-today-border",
      "data-in-range:rounded-none data-in-range:bg-date-picker-day-bg-range",
      "data-in-hover-range:rounded-none data-in-hover-range:bg-date-picker-day-bg-range-hover",
      "data-range-start:rounded-date-picker-day data-range-start:rounded-e-none",
      "data-range-end:rounded-date-picker-day data-range-end:rounded-s-none",
      "data-range-end:bg-date-picker-day-bg-selected data-range-start:bg-date-picker-day-bg-selected",
      "data-range-end:text-date-picker-day-fg-selected data-range-start:text-date-picker-day-fg-selected",
      "data-selected:bg-date-picker-day-bg-selected data-selected:font-date-picker-view data-selected:text-date-picker-day-fg-selected",
      "data-selected:hover:bg-date-picker-day-bg-selected-hover",
      "data-unavailable:text-date-picker-day-fg-unavailable data-unavailable:line-through",
      "data-outside-range:opacity-date-picker-outside",
      "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-date-picker-disabled",
      "forced-colors:data-selected:outline-2",
      "forced-colors:data-disabled:opacity-date-picker-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    periodTrigger: [
      "w-full rounded-date-picker-day p-date-picker-calendar-cell",
      "text-date-picker-day-fg hover:bg-date-picker-day-bg-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-date-picker-day-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-selected:bg-date-picker-day-bg-selected data-selected:font-date-picker-view data-selected:text-date-picker-day-fg-selected",
      "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-date-picker-disabled",
    ],
    timeControl: [
      "grid shrink-0 grid-cols-1 gap-date-picker-time border-date-picker-time-border border-t",
      "bg-date-picker-time-bg p-date-picker-time text-date-picker-time-fg",
      "sm:data-[selection-mode=range]:grid-cols-2",
    ],
    timeGroup: [
      "flex min-w-0 items-center gap-date-picker-time",
      "data-[index=1]:border-date-picker-time-border data-[index=1]:border-t data-[index=1]:pt-date-picker-time",
      "sm:data-[index=1]:border-s sm:data-[index=1]:border-t-0 sm:data-[index=1]:ps-date-picker-time sm:data-[index=1]:pt-0",
    ],
    timeGroupLabel:
      "shrink-0 font-date-picker-view text-date-picker-time-label text-date-picker-time-label-fg",
    timeFields: "flex min-w-0 items-center gap-date-picker-indicator",
    timeField: "w-date-picker-time-field shrink-0",
    timeLabel: "sr-only",
    timeSeparator: "shrink-0 text-date-picker-time-label-fg tabular-nums",
    timeInput:
      "token-date-picker-time-input px-date-picker-time-input text-center tabular-nums",
    dayPeriod: [
      "border-(length:--border-width-date-picker-time) h-date-picker-time-field rounded-date-picker-time text-date-picker-sm",
      "border-date-picker-time-border bg-date-picker-time-bg px-date-picker-calendar-cell text-date-picker-time-fg",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-date-picker-time-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "disabled:cursor-not-allowed disabled:opacity-date-picker-disabled",
    ],
    timeZone:
      "ms-auto self-center truncate text-date-picker-time-label text-date-picker-time-label-fg",
    footer: [
      "flex shrink-0 items-center justify-end gap-date-picker-footer border-date-picker-footer-border border-t",
      "p-date-picker-footer",
    ],
    cancelTrigger: "shrink-0 text-date-picker-content-fg",
    confirmTrigger: "shrink-0",
  },
  variants: {
    size: {
      sm: {
        inputControl:
          "h-form-control-sm rounded-date-picker-control-sm p-date-picker-segments-sm text-date-picker-sm",
        trigger: "size-icon-control-sm text-icon-control-sm",
        clearTrigger: "size-icon-control-sm text-icon-control-sm",
        content: "text-date-picker-content-sm",
        dayTrigger: "size-date-picker-day-sm",
        tableHeader: "h-date-picker-day-sm",
      },
      md: {
        inputControl:
          "h-form-control-md rounded-date-picker-control-md p-date-picker-segments-md text-date-picker-md",
        trigger: "size-icon-control-md text-icon-control-md",
        clearTrigger: "size-icon-control-md text-icon-control-md",
        content: "text-date-picker-content-md",
        dayTrigger: "size-date-picker-day-md",
        tableHeader: "h-date-picker-day-md",
      },
      lg: {
        inputControl:
          "h-form-control-lg rounded-date-picker-control-lg p-date-picker-segments-lg text-date-picker-lg",
        trigger: "size-icon-control-lg text-icon-control-lg",
        clearTrigger: "size-icon-control-lg text-icon-control-lg",
        content: "text-date-picker-content-lg",
        dayTrigger: "size-date-picker-day-lg",
        tableHeader: "h-date-picker-day-lg",
      },
    },
    timed: {
      true: {
        calendar: "p-date-picker-content-timed",
        dayTrigger: "h-date-picker-day-timed",
        tableHeader: "h-date-picker-day-timed",
      },
    },
  },
  defaultVariants: { size: "md" },
})

type DatePickerStyles = ReturnType<typeof datePickerVariants>

type DatePickerContextValue = {
  acceptedValue: DatePickerPublicValue | null
  canConfirm: boolean
  clearValue: () => void
  coordinator: DatePickerCoordinatorState
  dateInputApi: DateInputApi
  dir: "ltr" | "rtl"
  locale: string
  timeZone: string
  validationMessage?: string
  validationMessageId: string
  prepareSegmentDeletion: (text: string) => void
  sendSegmentInput: (
    index: 0 | 1,
    segment: ReturnType<DateInputApi["getSegments"]>[number],
    input: string
  ) => void
  granularity: DatePickerGranularity
  hideTimeZone: boolean
  hourCycle: 12 | 24
  isTimed: boolean
  max?: DateValue
  min?: DateValue
  numOfMonths: number
  pickerApi: ZagDatePickerApi
  requestOpen: (open: boolean) => void
  required: boolean
  selectionMode: DatePickerSelectionMode
  setDraftTimePart: (
    part: DatePickerDraftTimePart,
    value: number | null,
    index?: DatePickerCandidateIndex
  ) => void
  setDraftValue: (value: DatePickerCandidate) => void
  size: DatePickerSize
  styles: DatePickerStyles
  submitDraft: () => void
  triggerElementRef: { current: HTMLButtonElement | null }
  descriptions: DescribedBy
  errorDescriptions: DescribedBy
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null)

function useDatePickerContext() {
  const context = useContext(DatePickerContext)

  if (!context) {
    throw new Error("DatePicker components must be used within DatePicker.Root")
  }

  return context
}

function toCompleteDatePickerRange(
  value: readonly DateValue[]
): DatePickerRange<DateValue> | null {
  const start = value[0]
  const end = value[1]

  if (!(start && end && start.compare(end) <= 0)) {
    return null
  }

  return [start, end]
}

function toDateValues(
  value: DateValue | readonly DateValue[] | null | undefined
): DateValue[] {
  if (isDateValueArray(value)) {
    return [...value]
  }

  return value ? [value] : []
}

function isDateValueArray(
  value: DateValue | readonly DateValue[] | null | undefined
): value is readonly DateValue[] {
  return Array.isArray(value)
}

function serializeDatePickerValue(
  value: DatePickerPublicValue | null
): string | DatePickerRange<string> {
  if (Array.isArray(value)) {
    const range = toCompleteDatePickerRange(value)
    return range ? [range[0].toString(), range[1].toString()] : ["", ""]
  }

  return value?.toString() ?? ""
}

function resolveDatePickerHourCycle(locale: string, hourCycle?: 12 | 24) {
  return (
    hourCycle ??
    (new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
      .hour12
      ? 12
      : 24)
  )
}

function navigateDatePickerPanelMonths(
  current: DateValue[],
  index: number,
  day: DateValue
) {
  const selectedMonth = day.set({ day: 1 })
  const next = [...current]
  next[index] = selectedMonth
  for (let i = index - 1; i >= 0; i--) {
    const neighbor = next[i + 1]
    const month = next[i]
    if (!(neighbor && month)) {
      continue
    }
    if (month.compare(neighbor) >= 0) {
      next[i] = neighbor.subtract({ months: 1 })
    }
  }
  for (let i = index + 1; i < next.length; i++) {
    const neighbor = next[i - 1]
    const month = next[i]
    if (!(neighbor && month)) {
      continue
    }
    if (month.compare(neighbor) <= 0) {
      next[i] = neighbor.add({ months: 1 })
    }
  }
  return next
}

function useDatePickerEnvironment(
  explicitDisabled: boolean | undefined,
  explicitDir: string | undefined,
  ref: Ref<HTMLDivElement> | undefined
) {
  const rootElementRef = useRef<HTMLDivElement>(null)
  const disabledProbeRef = useRef<HTMLInputElement>(null)
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null)
  const [inheritedDir, setInheritedDir] = useState<"ltr" | "rtl">("ltr")
  const disabled = useEffectiveDisabled(rootElement, explicitDisabled)
  const dir =
    explicitDir === "rtl" || explicitDir === "ltr" ? explicitDir : inheritedDir
  const rootRef = useMemo(
    () => composeDatePickerRefs(rootElementRef, setRootElement, ref),
    [ref]
  )
  useLayoutEffect(() => {
    const root = rootElementRef.current
    if (!root) {
      return
    }
    const update = () => {
      setInheritedDir(
        root.ownerDocument.defaultView?.getComputedStyle(root).direction ===
          "rtl"
          ? "rtl"
          : "ltr"
      )
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(root.ownerDocument.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["dir"],
      childList: true,
    })
    return () => observer.disconnect()
  }, [])
  return { rootElementRef, disabledProbeRef, rootRef, disabled, dir }
}

// biome-ignore lint/style/useUnifiedTypeSignatures: overloads preserve the granularity-discriminated public contract.
export function DatePicker(props: DatePickerDayRootProps): ReactElement
export function DatePicker(props: DatePickerTimedRootProps): ReactElement
export function DatePicker(props: DatePickerDayRangeRootProps): ReactElement
export function DatePicker(props: DatePickerTimedRangeRootProps): ReactElement
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: coordinates the four public day/time and single/range modes while keeping their commit boundary shared.
export function DatePicker({
  children,
  className,
  defaultOpen = false,
  defaultValue,
  disabled: explicitDisabled,
  dir: explicitDir,
  endName,
  flip = true,
  form,
  granularity = "day",
  gutter = 8,
  hideTimeZone = false,
  hourCycle,
  id,
  invalid,
  isDateUnavailable,
  isTimeUnavailable,
  locale = "en-US",
  max: maximum,
  min: minimum,
  name,
  numOfMonths,
  offset = { mainAxis: 8, crossAxis: 0 },
  onOpenChange,
  onValueChange,
  open,
  overflowPadding = 8,
  placement = "bottom-start",
  readOnly,
  ref,
  required,
  sameWidth = false,
  selectionMode = "single",
  shouldForceLeadingZeros = false,
  size = "md",
  slide = true,
  startOfWeek,
  startName,
  timeZone = "UTC",
  value,
  ...htmlProps
}: DatePickerRootProps) {
  const generatedId = useId()
  const uniqueId = id ?? generatedId
  const { rootElementRef, disabledProbeRef, rootRef, disabled, dir } =
    useDatePickerEnvironment(explicitDisabled, explicitDir, ref)
  const isTimed = granularity !== "day"
  const min = minimum && normalizeDatePickerTimeZone(minimum, timeZone)
  const max = maximum && normalizeDatePickerTimeZone(maximum, timeZone)
  const resolvedHourCycle = resolveDatePickerHourCycle(locale, hourCycle)
  const [uncontrolledValue, setUncontrolledValue] =
    useState<DatePickerPublicValue | null>(() => defaultValue ?? null)
  const initialValue = useRef(defaultValue ?? null)
  const acceptedValue: DatePickerPublicValue | null =
    value === undefined ? uncontrolledValue : value
  // Preserve the accepted wire value, but use one clock/zone for both machines
  // and the popup draft. Normalize before taking a month/day from an instant.
  const acceptedValues = toDateValues(acceptedValue).map((date) =>
    normalizeDatePickerTimeZone(date, timeZone)
  )
  const acceptedScalarValue = acceptedValues[0] ?? null
  const acceptedCandidate: DatePickerCandidate =
    selectionMode === "range" ? acceptedValues : acceptedScalarValue
  const [segmentInputDraft, setSegmentInputDraft] = useState<
    DateValue[] | null
  >(null)
  const [nativeInvalid, setNativeInvalid] = useState(false)
  const resetting = useRef(false)
  const [inputSyncRevision, synchronizeInput] = useReducer(
    (revision: number) => revision + 1,
    0
  )
  const [rangeInputDraft, setRangeInputDraft] = useState<DateValue[] | null>(
    null
  )
  const usesPopupDraft = isTimed || selectionMode === "range"
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const interactionBlocked = disabled || readOnly
  const resolvedOpen =
    !interactionBlocked && (open === undefined ? uncontrolledOpen : open)
  const isTimedRangePopupOpen =
    isTimed && selectionMode === "range" && resolvedOpen
  const [coordinator, dispatch] = useReducer(
    datePickerCoordinatorReducer,
    undefined,
    () =>
      usesPopupDraft && resolvedOpen
        ? {
            draft: {
              baseline: acceptedCandidate,
              candidate: acceptedCandidate,
            },
          }
        : createDatePickerCoordinatorState()
  )
  const acceptedValueAsString = serializeDatePickerValue(acceptedValue)
  const acceptedValuesAsString = toDateValues(acceptedValue).map((item) =>
    item.toString()
  )
  const acceptedValueKey = JSON.stringify([timeZone, acceptedValueAsString])
  useEffect(() => {
    if (interactionBlocked) {
      setUncontrolledOpen(false)
      setRangeInputDraft(null)
      dispatch({ type: "discard" })
      if (open) {
        onOpenChange?.({ open: false })
      }
    }
  }, [interactionBlocked, open, onOpenChange])
  const previousAcceptedValue = useRef(acceptedValueKey)
  const previousOpen = useRef(resolvedOpen)
  const triggerElementRef = useRef<HTMLButtonElement>(null)
  const focusRestoreContent = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (resolvedOpen) {
      return
    }
    const content = focusRestoreContent.current
    focusRestoreContent.current = null
    return content
      ? restoreFocusAfterOverlayClose(content, () => triggerElementRef.current)
      : undefined
  }, [resolvedOpen])
  const styles = datePickerVariants({ size, timed: isTimed })
  const descriptions = useDescribedBy()
  const errorDescriptions = useDescribedBy()

  // biome-ignore lint/correctness/useExhaustiveDependencies: the environment hook returns stable DOM refs; read current nodes only when the interaction mode changes.
  useLayoutEffect(() => {
    // The trigger is omitted in read-only mode. Restore popup focus to a
    // surviving value segment, but never steal focus from an external control.
    if (readOnly && !disabled && previousOpen.current && !resolvedOpen) {
      const root = rootElementRef.current
      const document = root?.ownerDocument
      const focusedPopup = document?.activeElement?.closest(
        '[data-scope="date-picker"][data-part="content"]'
      )
      if (
        document &&
        (document.activeElement === document.body ||
          focusedPopup?.id === `${root?.id}:content`)
      ) {
        root
          ?.querySelector<HTMLElement>('[role="spinbutton"]')
          ?.focus({ preventScroll: true })
      }
    }
  }, [readOnly, disabled, resolvedOpen])

  useEffect(() => {
    if (previousOpen.current === resolvedOpen) {
      return
    }

    previousOpen.current = resolvedOpen
    const pendingTimedRange =
      resolvedOpen && isTimed && selectionMode === "range" && rangeInputDraft
        ? toCompleteDatePickerRange(rangeInputDraft)
        : null
    if (selectionMode === "range") {
      setRangeInputDraft(null)
    }
    if (!(resolvedOpen && usesPopupDraft)) {
      dispatch({ type: "discard" })
      return
    }

    dispatch({ type: "open", value: acceptedCandidate })
    if (pendingTimedRange) {
      dispatch({ type: "edit", value: pendingTimedRange })
    }
  }, [
    acceptedCandidate,
    isTimed,
    rangeInputDraft,
    resolvedOpen,
    selectionMode,
    usesPopupDraft,
  ])

  useEffect(() => {
    if (previousAcceptedValue.current === acceptedValueKey) {
      return
    }

    previousAcceptedValue.current = acceptedValueKey
    setRangeInputDraft(null)
    setSegmentInputDraft(null)
    if (usesPopupDraft && resolvedOpen) {
      dispatch({ type: "resync", value: acceptedCandidate })
    }
  }, [acceptedCandidate, acceptedValueKey, resolvedOpen, usesPopupDraft])

  const candidateAllowed = (candidate: DatePickerCandidate) =>
    isDatePickerCandidateAllowed(candidate, {
      min,
      max,
      isTimeUnavailable,
      isDateUnavailable: isDateUnavailable
        ? (date) => isDateUnavailable(date, locale)
        : undefined,
    })
  const commitValue = (nextValue: DatePickerPublicValue | null) => {
    if (
      interactionBlocked ||
      resetting.current ||
      !candidateAllowed(nextValue) ||
      disabledProbeRef.current?.matches(":disabled")
    ) {
      return
    }
    setSegmentInputDraft(null)
    setNativeInvalid(false)
    if (value === undefined) {
      setUncontrolledValue(nextValue)
    }

    ;(
      onValueChange as
        | ((
            details: DatePickerValueChangeDetails<DatePickerPublicValue>
          ) => void)
        | undefined
    )?.({
      value: nextValue,
      valueAsString: serializeDatePickerValue(nextValue),
    })
  }

  const requestOpen = (nextOpen: boolean) => {
    if (nextOpen && interactionBlocked) {
      return
    }
    if (nextOpen === resolvedOpen) {
      return
    }

    const activeElement = rootElementRef.current?.ownerDocument.activeElement
    if (nextOpen) {
      focusRestoreContent.current = null
    } else {
      // Selection and Zag's close notification can both request the same close.
      // Keep the original content even if the second request sees BODY already.
      focusRestoreContent.current =
        activeElement?.closest<HTMLElement>(
          '[data-scope="date-picker"][data-part="content"]'
        ) ?? focusRestoreContent.current
    }

    if (open === undefined) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.({ open: nextOpen })
  }

  const draftValue = coordinator.draft
    ? coordinator.draft.candidate
    : acceptedCandidate
  const pickerValues =
    usesPopupDraft && resolvedOpen ? toDateValues(draftValue) : acceptedValues
  const dateInputValues =
    selectionMode === "range" && !isTimedRangePopupOpen
      ? (rangeInputDraft ?? acceptedValues)
      : (segmentInputDraft ?? acceptedValues)
  const resolvedNumOfMonths =
    numOfMonths ?? DEFAULT_DATE_PICKER_MONTHS[selectionMode]

  const pickerService = useMachine(datePickerMachine, {
    closeOnSelect: !isTimed,
    dir,
    disabled,
    id: `${uniqueId}-calendar`,
    ids: {
      label: () => `${uniqueId}-label`,
    },
    invalid,
    isDateUnavailable,
    locale,
    max,
    min,
    fixedWeeks: resolvedNumOfMonths > 1,
    numOfMonths: 1,
    onOpenChange: (details) => requestOpen(details.open),
    onValueChange: (details) => {
      const nextValue = details.value[0] ?? null

      if (selectionMode === "range") {
        dispatch({ type: "edit", value: details.value })
        const nextRange = toCompleteDatePickerRange(details.value)
        if (isTimed || !nextRange) {
          return
        }

        commitValue(nextRange)
        requestOpen(false)
        return
      }

      if (isTimed) {
        dispatch({ type: "edit", value: nextValue })
        return
      }

      commitValue(nextValue)
      requestOpen(false)
    },
    open: resolvedOpen,
    openOnClick: false,
    outsideDaySelectable: true,
    positioning: {
      flip,
      gutter,
      offset,
      overflowPadding,
      placement,
      sameWidth,
      slide,
    },
    readOnly,
    required,
    selectionMode,
    startOfWeek,
    timeZone,
    value: pickerValues,
  })
  const pickerApi = connectDatePicker(pickerService, normalizeProps)

  const dateInputService = useMachine(datePickerInputMachine, {
    disabled,
    dir,
    granularity,
    hideTimeZone,
    hourCycle,
    id: `${uniqueId}-input`,
    ids: {
      label: () => `${uniqueId}-label`,
    },
    invalid,
    isDateUnavailable,
    locale,
    max,
    min,
    onValueChange: (details) => {
      if (
        interactionBlocked ||
        resetting.current ||
        disabledProbeRef.current?.matches(":disabled")
      ) {
        return
      }
      if (value !== undefined) {
        synchronizeInput()
      }
      if (selectionMode === "range") {
        dispatch({ type: "edit", value: details.value })
        if (isTimedRangePopupOpen) {
          return
        }

        setRangeInputDraft(details.value)
        const nextRange = toCompleteDatePickerRange(details.value)
        if (nextRange) {
          if (isTimed) {
            requestOpen(true)
            return
          }

          setRangeInputDraft(null)
          commitValue(nextRange)
          requestOpen(false)
        }
        return
      }

      const nextValue = details.value[0] ?? null
      if (!candidateAllowed(nextValue)) {
        setSegmentInputDraft(details.value)
        return
      }
      commitValue(nextValue)
    },
    readOnly: readOnly || (isTimed && resolvedOpen),
    required,
    selectionMode,
    shouldForceLeadingZeros,
    timeZone,
    value: dateInputValues,
  })
  const dateInputApi = connectDateInput(dateInputService, normalizeProps)
  // A refused controlled proposal does not change Zag's committed-value hash.
  // Reconcile its separate editable display after the parent has accepted or
  // refused, without VALUE.SET or another public change callback.
  // biome-ignore lint/correctness/useExhaustiveDependencies: synchronize only on a proposal/reset checkpoint; the service is recreated each render.
  useLayoutEffect(() => {
    if (inputSyncRevision) {
      dateInputService.send({ type: "AUTHORITATIVE.SYNC" })
    }
  }, [inputSyncRevision])
  const reset = useRef<() => void>(() => undefined)
  reset.current = () => {
    if (value === undefined) {
      setUncontrolledValue(initialValue.current)
    }
    setSegmentInputDraft(null)
    setRangeInputDraft(null)
    setNativeInvalid(false)
    dispatch({ type: "discard" })
    setUncontrolledOpen(false)
    dateInputService.context.set("enteredKeys", "")
    synchronizeInput()
    const restoredValues = toDateValues(
      value === undefined ? initialValue.current : value
    ).map((date) => date.toString())
    const probe = disabledProbeRef.current
    if (probe) {
      // Use the instance setter, including React's value tracker. No events:
      // native reset restores defaults; it is not a user value proposal.
      probe.value =
        restoredValues.length === (selectionMode === "range" ? 2 : 1)
          ? restoredValues.join("/")
          : ""
    }
    rootElementRef.current
      ?.querySelectorAll<HTMLInputElement>(
        ':scope > input[data-scope="date-picker"][data-part="hidden-input"]'
      )
      .forEach((input, index) => {
        input.value = restoredValues[index] ?? ""
      })
    if (open) {
      onOpenChange?.({ open: false })
    }
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: the environment returns a stable ref; the adapter follows its input owner.
  useEffect(() => {
    const input = disabledProbeRef.current
    return input
      ? subscribeOwnerFormReset(input, () => reset.current(), {
          onResetStart: () => {
            resetting.current = true
          },
          onResetEnd: () => {
            resetting.current = false
          },
        })
      : undefined
  }, [])

  useLayoutEffect(() => {
    const probe = disabledProbeRef.current
    if (!probe || readOnly || disabled) {
      probe?.setCustomValidity("")
      return
    }
    const count = selectionMode === "range" ? 2 : 1
    const incomplete = Array.from({ length: count }, (_, index) =>
      dateInputApi.getSegments({ index: index === 0 ? 0 : 1 })
    )
      .flat()
      .some((segment) => segment.isEditable && segment.isPlaceholder)
    const candidate =
      selectionMode === "range"
        ? (rangeInputDraft ?? acceptedValues)
        : (segmentInputDraft?.[0] ?? acceptedScalarValue)
    probe.setCustomValidity(
      (required && incomplete) ||
        !candidateAllowed(
          Array.isArray(candidate) && candidate.length === 0 ? null : candidate
        )
        ? "Complete an available date and time."
        : ""
    )
  })

  const canConfirm =
    !interactionBlocked &&
    canConfirmDatePickerDraft(
      coordinator,
      isTimeUnavailable,
      min,
      max,
      isDateUnavailable ? (date) => isDateUnavailable(date, locale) : undefined
    )
  const submitDraft = () => {
    if (
      !(
        canConfirm &&
        coordinator.draft &&
        candidateAllowed(coordinator.draft.candidate)
      )
    ) {
      return
    }

    const candidate = coordinator.draft.candidate
    if (selectionMode === "range") {
      if (candidate === null) {
        commitValue(null)
      } else {
        const nextRange = toCompleteDatePickerRange(toDateValues(candidate))
        if (!nextRange) {
          return
        }
        commitValue(nextRange)
      }
    } else if (!isDateValueArray(candidate)) {
      commitValue(candidate)
    }
    requestOpen(false)
  }
  const clearValue = () => {
    if (interactionBlocked) {
      return
    }

    setRangeInputDraft(null)
    setSegmentInputDraft(null)
    if (isTimed && resolvedOpen) {
      dispatch({ type: "edit", value: null })
      return
    }

    commitValue(null)
  }
  const validationMessageId = `${uniqueId}-validation`
  const invalidCandidate =
    (segmentInputDraft !== null &&
      !candidateAllowed(
        selectionMode === "range"
          ? segmentInputDraft
          : (segmentInputDraft[0] ?? null)
      )) ||
    (rangeInputDraft !== null &&
      rangeInputDraft.length === 2 &&
      !candidateAllowed(rangeInputDraft)) ||
    (coordinator.draft?.candidate != null &&
      !candidateAllowed(coordinator.draft.candidate))
  let validationMessage = nativeInvalid
    ? "Complete every date and time segment before submitting."
    : undefined
  if (invalidCandidate) {
    validationMessage = `Choose an available date and time${min ? ` on or after ${min.toString()}` : ""}${max ? ` on or before ${max.toString()}` : ""}.`
  }
  const rootProps = mergeProps(htmlProps, pickerApi.getRootProps())

  return (
    <DatePickerContext.Provider
      value={{
        acceptedValue,
        canConfirm,
        clearValue,
        coordinator,
        dateInputApi,
        dir,
        locale,
        timeZone,
        validationMessage,
        validationMessageId,
        prepareSegmentDeletion: (text) => {
          const normalized = normalizeDatePickerDigits(text, locale)
          if (normalized !== text) {
            dateInputService.context.set("enteredKeys", normalized)
          }
        },
        sendSegmentInput: (_index, segment, input) => {
          if (
            !(
              interactionBlocked ||
              disabledProbeRef.current?.matches(":disabled")
            )
          ) {
            dateInputService.send({ type: "SEGMENT.INPUT", segment, input })
          }
        },
        granularity,
        hideTimeZone,
        hourCycle: resolvedHourCycle,
        isTimed,
        max,
        min,
        numOfMonths: resolvedNumOfMonths,
        pickerApi,
        requestOpen,
        required: Boolean(required),
        selectionMode,
        setDraftTimePart: (part, nextValue, index = 0) => {
          if (!interactionBlocked && granularity !== "day") {
            dispatch({
              type: "edit-time",
              granularity,
              hourCycle: resolvedHourCycle,
              index,
              part,
              value: nextValue,
            })
          }
        },
        setDraftValue: (nextValue) => {
          if (!interactionBlocked) {
            dispatch({ type: "edit", value: nextValue })
          }
        },
        size,
        styles,
        submitDraft,
        triggerElementRef,
        descriptions,
        errorDescriptions,
      }}
    >
      <div
        {...rootProps}
        className={styles.root({ className })}
        data-granularity={granularity}
        data-selection-mode={selectionMode}
        dir={explicitDir}
        ref={rootRef}
      >
        {children}
        {validationMessage && (
          <StatusText id={validationMessageId} size={size} status="error">
            {validationMessage}
          </StatusText>
        )}
        <input
          aria-hidden="true"
          className="sr-only"
          disabled={explicitDisabled}
          form={form}
          onChange={() => {
            /* Validation-only proxy; editable segments own the value. */
          }}
          onFocus={() =>
            rootElementRef.current
              ?.querySelector<HTMLElement>('[role="spinbutton"]')
              ?.focus()
          }
          onInvalid={(event) => {
            event.preventDefault()
            setNativeInvalid(true)
            const root = rootElementRef.current
            const incomplete = root?.querySelector<HTMLElement>(
              '[role="spinbutton"][data-placeholder-shown]'
            )
            ;(
              incomplete ??
              root?.querySelector<HTMLElement>('[role="spinbutton"]')
            )?.focus()
          }}
          readOnly={readOnly}
          ref={disabledProbeRef}
          required={required}
          tabIndex={-1}
          value={
            acceptedValuesAsString.length ===
            (selectionMode === "range" ? 2 : 1)
              ? acceptedValuesAsString.join("/")
              : ""
          }
        />
        <DatePickerFormValue
          disabled={disabled}
          form={form}
          names={selectionMode === "range" ? [startName, endName] : [name]}
          values={acceptedValuesAsString}
        />
      </div>
    </DatePickerContext.Provider>
  )
}

function DatePickerFormValue({
  disabled,
  form,
  names,
  values,
}: {
  disabled?: boolean
  form?: string
  names: (string | undefined)[]
  values: string[]
}) {
  return (
    <>
      {names.map((name, index) => (
        <input
          data-part="hidden-input"
          data-scope="date-picker"
          disabled={disabled}
          form={form}
          key={name ?? index}
          name={name}
          type="hidden"
          value={values[index] ?? ""}
        />
      ))}
    </>
  )
}

export type DatePickerLabelProps = ComponentPropsWithoutRef<"label"> & {
  ref?: Ref<HTMLLabelElement>
}

DatePicker.Label = function DatePickerLabel({
  children,
  className,
  ref,
  ...props
}: DatePickerLabelProps) {
  const { dateInputApi, pickerApi, required, size, styles } =
    useDatePickerContext()
  const labelProps = mergeProps(
    { ...props, ref },
    pickerApi.getLabelProps(),
    dateInputApi.getLabelProps()
  )

  return (
    <Label
      {...labelProps}
      className={styles.label({ className })}
      disabled={dateInputApi.disabled}
      required={required}
      size={size}
    >
      {children}
    </Label>
  )
}

export type DatePickerControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

DatePicker.Control = function DatePickerControl({
  children,
  className,
  ref,
  ...props
}: DatePickerControlProps) {
  const {
    dateInputApi,
    pickerApi,
    selectionMode,
    size,
    validationMessage,
    styles,
  } = useDatePickerContext()
  const controlProps = mergeProps(props, pickerApi.getControlProps())
  const { "data-invalid": _dataInvalid, ...dateInputControlProps } =
    dateInputApi.getControlProps()

  return (
    <div {...controlProps} className={styles.control({ className })} ref={ref}>
      <div
        {...dateInputControlProps}
        className={styles.inputControl()}
        data-disabled={dateInputApi.disabled || undefined}
        data-readonly={pickerApi.readOnly || undefined}
        data-selection-mode={selectionMode}
        data-size={size}
        data-validation={
          dateInputApi.invalid || validationMessage ? "error" : undefined
        }
      >
        {children}
      </div>
    </div>
  )
}

export type DatePickerSegmentsProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  endLabel?: string
  ref?: Ref<HTMLDivElement>
  separator?: ReactNode
  startLabel?: string
}

DatePicker.Segments = function DatePickerSegments({
  className,
  endLabel = "End",
  ref,
  separator = "–",
  startLabel = "Start",
  ...props
}: DatePickerSegmentsProps) {
  const {
    dateInputApi,
    locale,
    sendSegmentInput,
    prepareSegmentDeletion,
    validationMessage,
    validationMessageId,
    required,
    selectionMode,
    styles,
    descriptions,
    errorDescriptions,
  } = useDatePickerContext()
  const startDescriptorId = useId()
  const endDescriptorId = useId()

  const renderSegments = (index: 0 | 1) =>
    dateInputApi.getSegments({ index }).map((segment, segmentIndex) => {
      if (segment.type === "literal") {
        return (
          <span
            {...dateInputApi.getSegmentProps({ index, segment })}
            className={styles.segment()}
            // biome-ignore lint/suspicious/noArrayIndexKey: repeated localized literals are stable segment positions.
            key={`literal-${segmentIndex}`}
          >
            {segment.text}
          </span>
        )
      }
      const hasError = Boolean(
        validationMessage ||
          dateInputApi.invalid ||
          errorDescriptions.describedById
      )
      const errorIds = joinDescribedBy(
        errorDescriptions.describedById,
        validationMessage ? validationMessageId : undefined
      )
      return (
        <span
          role="spinbutton"
          {...dateInputApi.getSegmentProps({ index, segment })}
          aria-describedby={joinDescribedBy(
            props["aria-describedby"],
            descriptions.describedById,
            validationMessage ? validationMessageId : undefined
          )}
          aria-errormessage={hasError ? errorIds : undefined}
          aria-invalid={hasError || undefined}
          aria-required={required || undefined}
          className={styles.segment()}
          // biome-ignore lint/suspicious/noArrayIndexKey: localized literal separators can repeat; their segment positions are stable within a locale.
          key={`${segment.type}-${segmentIndex}`}
          onBeforeInput={(event) => {
            if (
              dateInputApi.disabled ||
              dateInputApi.getSegmentState({ index, segment }).readonly
            ) {
              event.preventDefault()
              return
            }
            const native = event.nativeEvent as InputEvent
            const data = native.data
            if (
              data &&
              DATE_PICKER_ASCII_DIGIT.test(
                normalizeDatePickerDigits(data, locale)
              )
            ) {
              event.preventDefault()
              for (const input of normalizeDatePickerDigits(data, locale)) {
                sendSegmentInput(index, segment, input)
              }
              return
            }
            dateInputApi
              .getSegmentProps({ index, segment })
              .onBeforeInput?.(event)
          }}
          onFocus={(event) => {
            dateInputApi.getSegmentProps({ index, segment }).onFocus?.(event)
            event.currentTarget.scrollIntoView({
              block: "nearest",
              inline: "nearest",
            })
          }}
          onKeyDown={(event) => {
            if (
              dateInputApi.disabled ||
              dateInputApi.getSegmentState({ index, segment }).readonly
            ) {
              if (event.key !== "Tab") {
                event.preventDefault()
              }
              return
            }
            if (event.key === "Backspace" || event.key === "Delete") {
              prepareSegmentDeletion(segment.text)
            }
            dateInputApi.getSegmentProps({ index, segment }).onKeyDown?.(event)
          }}
          onPaste={(event) => {
            if (
              dateInputApi.disabled ||
              dateInputApi.getSegmentState({ index, segment }).readonly
            ) {
              event.preventDefault()
              return
            }
            dateInputApi.getSegmentProps({ index, segment }).onPaste?.(event)
          }}
        >
          {segment.text}
        </span>
      )
    })

  if (selectionMode === "range") {
    const visibleLabel = props["aria-label"]
    const baseLabelId = dateInputApi.getLabelProps().id
    const getRangeGroupLabelProps = (
      index: 0 | 1,
      descriptorId: string,
      label: string
    ) => ({
      ...(visibleLabel
        ? { "aria-label": `${visibleLabel} ${label}` }
        : { "aria-labelledby": `${baseLabelId} ${descriptorId}` }),
      ...dateInputApi.getSegmentGroupProps({ index }),
      ...(visibleLabel
        ? {
            "aria-label": `${visibleLabel} ${label}`,
            "aria-labelledby": undefined,
          }
        : { "aria-labelledby": `${baseLabelId} ${descriptorId}` }),
    })

    return (
      <div
        {...props}
        aria-label={undefined}
        className={styles.segments({ className })}
        data-part="segments"
        data-scope="date-picker"
        data-selection-mode="range"
        ref={ref}
      >
        <div
          {...getRangeGroupLabelProps(0, startDescriptorId, startLabel)}
          className={styles.segmentGroup()}
        >
          <span className={styles.rangeLabel()} id={startDescriptorId}>
            {startLabel}
          </span>
          {renderSegments(0)}
        </div>
        <span
          aria-hidden="true"
          className={styles.rangeSeparator()}
          data-part="range-separator"
        >
          {separator}
        </span>
        <div
          {...getRangeGroupLabelProps(1, endDescriptorId, endLabel)}
          className={styles.segmentGroup()}
        >
          <span className={styles.rangeLabel()} id={endDescriptorId}>
            {endLabel}
          </span>
          {renderSegments(1)}
        </div>
      </div>
    )
  }

  const groupProps = mergeProps(props, dateInputApi.getSegmentGroupProps())
  return (
    <div {...groupProps} className={styles.segments({ className })} ref={ref}>
      {renderSegments(0)}
    </div>
  )
}

export type DatePickerIndicatorGroupProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

DatePicker.IndicatorGroup = function DatePickerIndicatorGroup({
  className,
  ref,
  ...props
}: DatePickerIndicatorGroupProps) {
  const { styles } = useDatePickerContext()

  return (
    <div
      {...props}
      className={styles.indicatorGroup({ className })}
      data-part="indicator-group"
      data-scope="date-picker"
      ref={ref}
    />
  )
}

export type DatePickerTriggerProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement>
}

DatePicker.Trigger = function DatePickerTrigger({
  children,
  className,
  icon,
  iconSize = "current",
  ref,
  size = "current",
  theme = "unstyled",
  type = "button",
  ...props
}: DatePickerTriggerProps) {
  const { dateInputApi, pickerApi, styles, triggerElementRef } =
    useDatePickerContext()
  const composedRef = useMemo(
    () => composeDatePickerRefs(triggerElementRef, ref),
    [triggerElementRef, ref]
  )
  const triggerProps = mergeProps(props, pickerApi.getTriggerProps())
  if (pickerApi.readOnly) {
    return null
  }

  return (
    <Button
      {...triggerProps}
      aria-invalid={dateInputApi.invalid || undefined}
      className={styles.trigger({ className })}
      icon={icon ?? (children ? undefined : "token-icon-date-picker-calendar")}
      iconSize={iconSize}
      ref={composedRef}
      size={size}
      theme={theme}
      type={type}
    >
      {children}
    </Button>
  )
}

export type DatePickerClearTriggerProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement>
}

DatePicker.ClearTrigger = function DatePickerClearTrigger({
  children,
  className,
  icon,
  iconSize = "current",
  onClick,
  ref,
  size = "current",
  theme = "unstyled",
  type = "button",
  ...props
}: DatePickerClearTriggerProps) {
  const { clearValue, pickerApi, styles } = useDatePickerContext()
  const { onClick: _onMachineClick, ...machineClearProps } =
    pickerApi.getClearTriggerProps()
  const clearProps = mergeProps(props, machineClearProps)
  const isClearDisabled = Boolean(
    clearProps.disabled || pickerApi.disabled || pickerApi.readOnly
  )
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (!(event.defaultPrevented || isClearDisabled)) {
      clearValue()
    }
  }

  if (pickerApi.readOnly) {
    return null
  }

  return (
    <Button
      {...clearProps}
      className={styles.clearTrigger({ className })}
      data-readonly={pickerApi.readOnly || undefined}
      disabled={isClearDisabled}
      icon={icon ?? (children ? undefined : "token-icon-date-picker-clear")}
      iconSize={iconSize}
      onClick={handleClick}
      ref={ref}
      size={size}
      theme={theme}
      type={type}
    >
      {children}
    </Button>
  )
}

export type DatePickerPositionerProps = ComponentPropsWithoutRef<"div"> & {
  forceMount?: boolean
  ref?: Ref<HTMLDivElement>
}

DatePicker.Positioner = function DatePickerPositioner({
  children,
  className,
  forceMount = false,
  ref,
  ...props
}: DatePickerPositionerProps) {
  const { pickerApi, styles } = useDatePickerContext()

  if (!(pickerApi.open || forceMount)) {
    return null
  }

  const positionerProps = mergeProps(props, pickerApi.getPositionerProps())
  const node = (
    <div
      {...positionerProps}
      className={styles.positioner({ className })}
      ref={ref}
    >
      {children}
    </div>
  )

  return <Portal>{node}</Portal>
}

export type DatePickerContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

DatePicker.Content = function DatePickerContent({
  className,
  ref,
  ...props
}: DatePickerContentProps) {
  const { isTimed, pickerApi, selectionMode, styles } = useDatePickerContext()
  const contentProps = mergeProps(props, pickerApi.getContentProps())

  return (
    <div
      {...contentProps}
      className={styles.content({ className })}
      data-selection-mode={selectionMode}
      data-timed={isTimed || undefined}
      ref={ref}
    />
  )
}

export type DatePickerCalendarProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  ref?: Ref<HTMLDivElement>
}

DatePicker.Calendar = function DatePickerCalendar({
  className,
  ref,
  ...props
}: DatePickerCalendarProps) {
  const {
    acceptedValue,
    max,
    min,
    numOfMonths,
    pickerApi,
    locale,
    timeZone,
    selectionMode,
    styles,
  } = useDatePickerContext()
  const formatCalendar = (
    date: DateValue,
    options: Intl.DateTimeFormatOptions
  ) => formatDatePickerCalendar(date, locale, timeZone, options)
  const createPanelMonths = () =>
    Array.from({ length: numOfMonths }, (_, index) =>
      getDatePickerCalendarDate(pickerApi.visibleRange.start, timeZone)
        .add({ months: index })
        .set({ day: 1 })
    )
  const [panelMonths, setPanelMonths] = useState<DateValue[]>(createPanelMonths)
  const [activePanelIndex, setActivePanelIndex] = useState<number | null>(null)
  const acceptedValueKey = JSON.stringify([
    timeZone,
    serializeDatePickerValue(acceptedValue),
  ])
  const previousAcceptedValue = useRef(acceptedValueKey)
  const previousNumOfMonths = useRef(numOfMonths)
  const previousView = useRef(pickerApi.view)
  const focusedMonthKey = `${pickerApi.focusedValue.year}-${pickerApi.focusedValue.month}`
  const visibleRangeStartKey = pickerApi.visibleRange.start.toString()

  // biome-ignore lint/correctness/useExhaustiveDependencies: the month signature and count are the complete reset key; the Zag facade and helper are recreated on every render.
  useEffect(() => {
    if (selectionMode !== "single") {
      return
    }

    setPanelMonths(createPanelMonths())
  }, [numOfMonths, selectionMode, visibleRangeStartKey])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the accepted value or panel count changes, not when Zag recreates its methods.
  useEffect(() => {
    if (
      previousAcceptedValue.current === acceptedValueKey &&
      previousNumOfMonths.current === numOfMonths
    ) {
      return
    }

    previousAcceptedValue.current = acceptedValueKey
    previousNumOfMonths.current = numOfMonths
    setPanelMonths(createPanelMonths())
    setActivePanelIndex(null)
    pickerApi.setView("day")
  }, [acceptedValueKey, numOfMonths])

  // biome-ignore lint/correctness/useExhaustiveDependencies: focusedMonthKey tracks the selected month without depending on unstable DateValue methods.
  useEffect(() => {
    const returnedToDay =
      previousView.current !== "day" && pickerApi.view === "day"
    previousView.current = pickerApi.view

    if (!(returnedToDay && activePanelIndex !== null)) {
      return
    }

    const selectedMonth = getDatePickerCalendarDate(
      pickerApi.focusedValue,
      timeZone
    ).set({ day: 1 })
    setPanelMonths((current) =>
      current.map((month, index) =>
        index === activePanelIndex ? selectedMonth : month
      )
    )
    setActivePanelIndex(null)
  }, [activePanelIndex, focusedMonthKey, pickerApi.view])

  const canShowPanelMonth = (index: number, value: DateValue) => {
    const monthStart = value.set({ day: 1 })
    const monthEnd = monthStart.add({ months: 1 }).subtract({ days: 1 })
    const previousMonth = panelMonths[index - 1]
    const nextMonth = panelMonths[index + 1]

    if (min && monthEnd.compare(min) < 0) {
      return false
    }
    if (max && monthStart.compare(max) > 0) {
      return false
    }
    if (previousMonth && monthStart.compare(previousMonth) <= 0) {
      return false
    }
    if (nextMonth && monthStart.compare(nextMonth) >= 0) {
      return false
    }

    return true
  }

  const movePanel = (index: number, months: number) => {
    const currentMonth = panelMonths[index]
    if (!currentMonth) {
      return
    }

    const nextMonth = currentMonth.add({ months }).set({ day: 1 })
    if (!canShowPanelMonth(index, nextMonth)) {
      return
    }

    setPanelMonths((current) =>
      current.map((month, panelIndex) =>
        panelIndex === index ? nextMonth : month
      )
    )
    setActivePanelIndex(null)
    pickerApi.setView("day")
    pickerApi.setFocusedValue(nextMonth)
  }

  const openPeriodChooser = (index: number) => {
    const panelMonth = panelMonths[index]
    if (!panelMonth) {
      return
    }

    setActivePanelIndex(index)
    pickerApi.setFocusedValue(panelMonth)
    pickerApi.setView("month")
  }

  const renderPanelNavigationTrigger = (
    index: number,
    months: number,
    view: "day" | "month"
  ) => {
    const isPrevious = months < 0
    const machineProps = isPrevious
      ? pickerApi.getPrevTriggerProps({ view })
      : pickerApi.getNextTriggerProps({ view })
    const panelMonth = panelMonths[index]
    const nextMonth = panelMonth?.add({ months }).set({ day: 1 })
    const disabled =
      pickerApi.disabled || !nextMonth || !canShowPanelMonth(index, nextMonth)
    const isYearJump = Math.abs(months) === 12
    const yearIcon = isPrevious
      ? "token-icon-date-picker-previous-year"
      : "token-icon-date-picker-next-year"
    const monthIcon = isPrevious
      ? "token-icon-date-picker-previous"
      : "token-icon-date-picker-next"

    return (
      <Button
        {...machineProps}
        className={styles.navigationTrigger()}
        disabled={disabled}
        icon={isYearJump ? yearIcon : monthIcon}
        iconSize="current"
        id={`${machineProps.id}-${index}-${Math.abs(months)}`}
        onClick={() => movePanel(index, months)}
        size="current"
        theme="unstyled"
        type="button"
      />
    )
  }

  const renderDayView = (month: DateValue, index: number) => {
    const visibleRange = {
      end: month.add({ months: 1 }).subtract({ days: 1 }),
      start: month,
    }
    const viewProps = pickerApi.getViewProps({ view: "day" })
    const synchronizeRangeDay = (day: DateValue) => {
      const state = pickerApi.getDayTableCellState({ value: day, visibleRange })
      if (
        selectionMode !== "range" ||
        !state.selectable ||
        pickerApi.readOnly
      ) {
        return
      }

      // Zag resets an existing range without updating its focused date. Keep
      // arrow navigation and the roving tab stop anchored to the activated day.
      pickerApi.setFocusedValue(day)

      if (state.outsideRange) {
        // Keep independently navigable panels ordered when a month moves onto
        // its neighbor; pointer and keyboard activation follow the same rule.
        setPanelMonths((current) =>
          navigateDatePickerPanelMonths(current, index, day)
        )
      }
    }

    return (
      <div {...viewProps} className={styles.view()} hidden={false}>
        <table
          {...pickerApi.getTableProps({ id: `panel-${index}`, view: "day" })}
          aria-label={formatCalendar(month, { month: "long", year: "numeric" })}
          className={styles.table()}
        >
          <thead
            {...pickerApi.getTableHeadProps({ view: "day" })}
            aria-hidden={undefined}
          >
            <tr {...pickerApi.getTableRowProps({ view: "day" })}>
              {pickerApi.weekDays.map((weekDay) => (
                <th
                  {...pickerApi.getTableHeaderProps({ view: "day" })}
                  aria-label={weekDay.long}
                  className={styles.tableHeader()}
                  key={weekDay.value.toString()}
                  scope="col"
                >
                  <abbr className="no-underline" title={weekDay.long}>
                    {formatCalendar(weekDay.value, { weekday: "narrow" })}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody {...pickerApi.getTableBodyProps({ view: "day" })}>
            {pickerApi.getMonthWeeks(month).map((week) => (
              <tr
                {...pickerApi.getTableRowProps({ view: "day" })}
                key={week[0]?.toString()}
              >
                {week.map((day) => (
                  <td
                    {...pickerApi.getDayTableCellProps({
                      value: day,
                      visibleRange,
                    })}
                    className={styles.tableCell()}
                    key={day.toString()}
                  >
                    <Button
                      {...mergeProps(
                        pickerApi.getDayTableCellTriggerProps({
                          value: day,
                          visibleRange,
                        }),
                        {
                          onClick: () => synchronizeRangeDay(day),
                          onKeyDown: (
                            event: KeyboardEvent<HTMLButtonElement>
                          ) => {
                            if (
                              event.key === "Enter" &&
                              !event.defaultPrevented
                            ) {
                              // Activate this button, not Zag's potentially stale
                              // focusedValue after focus moved programmatically.
                              event.preventDefault()
                              event.currentTarget.click()
                            }
                          },
                        }
                      )}
                      className={styles.dayTrigger()}
                      id={`${pickerApi.getDayTableCellTriggerProps({ value: day, visibleRange }).id}-panel-${index}`}
                      size="current"
                      theme="unstyled"
                      type="button"
                    >
                      {formatCalendar(day, { day: "numeric" })}
                    </Button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderMonthView = (index: number) => (
    <div
      {...pickerApi.getViewProps({ view: "month" })}
      className={styles.view()}
    >
      <table
        {...pickerApi.getTableProps({ columns: 3, view: "month" })}
        className={styles.table()}
      >
        <tbody {...pickerApi.getTableBodyProps({ view: "month" })}>
          {pickerApi.getMonthsGrid({ columns: 3 }).map((row) => (
            <tr
              {...pickerApi.getTableRowProps({ view: "month" })}
              key={row[0]?.value}
            >
              {row.map((month) => {
                const candidate = pickerApi.focusedValue
                  .set({ month: month.value })
                  .set({ day: 1 })
                const machineProps = pickerApi.getMonthTableCellTriggerProps({
                  columns: 3,
                  value: month.value,
                })
                const disabled =
                  Boolean(machineProps.disabled) ||
                  !canShowPanelMonth(index, candidate)

                return (
                  <td
                    {...pickerApi.getMonthTableCellProps({
                      columns: 3,
                      value: month.value,
                    })}
                    aria-disabled={disabled || undefined}
                    className={styles.tableCell()}
                    key={month.value}
                  >
                    <Button
                      {...machineProps}
                      aria-disabled={disabled || undefined}
                      className={styles.periodTrigger()}
                      data-disabled={disabled || undefined}
                      disabled={disabled}
                      size="current"
                      theme="unstyled"
                      type="button"
                    >
                      {month.label}
                    </Button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderYearView = () => (
    <div
      {...pickerApi.getViewProps({ view: "year" })}
      className={styles.view()}
    >
      <table
        {...pickerApi.getTableProps({ columns: 4, view: "year" })}
        className={styles.table()}
      >
        <tbody {...pickerApi.getTableBodyProps({ view: "year" })}>
          {pickerApi.getYearsGrid({ columns: 4 }).map((row) => (
            <tr
              {...pickerApi.getTableRowProps({ view: "year" })}
              key={row[0]?.value}
            >
              {row.map((year) => (
                <td
                  {...pickerApi.getYearTableCellProps({
                    columns: 4,
                    value: year.value,
                  })}
                  className={styles.tableCell()}
                  key={year.value}
                >
                  <Button
                    {...pickerApi.getYearTableCellTriggerProps({
                      columns: 4,
                      value: year.value,
                    })}
                    className={styles.periodTrigger()}
                    size="current"
                    theme="unstyled"
                    type="button"
                  >
                    {year.label}
                  </Button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderPeriodPanel = (index: number) => (
    <>
      <div
        {...pickerApi.getViewControlProps({ view: pickerApi.view })}
        className={styles.viewControl()}
      >
        <Button
          {...pickerApi.getPrevTriggerProps({ view: pickerApi.view })}
          className={styles.navigationTrigger()}
          icon="token-icon-date-picker-previous"
          iconSize="current"
          size="current"
          theme="unstyled"
          type="button"
        />
        {pickerApi.view === "month" ? (
          <Button
            {...pickerApi.getViewTriggerProps({ view: "month" })}
            className={styles.viewTrigger()}
            size="current"
            theme="unstyled"
            type="button"
          >
            {pickerApi.focusedValue.year}
          </Button>
        ) : (
          <span className={styles.viewHeading()}>
            {pickerApi.getDecade().start}–{pickerApi.getDecade().end}
          </span>
        )}
        <Button
          {...pickerApi.getNextTriggerProps({ view: pickerApi.view })}
          className={styles.navigationTrigger()}
          icon="token-icon-date-picker-next"
          iconSize="current"
          size="current"
          theme="unstyled"
          type="button"
        />
      </div>
      {pickerApi.view === "month" ? renderMonthView(index) : null}
      {pickerApi.view === "year" ? renderYearView() : null}
    </>
  )

  const renderDayPanel = (month: DateValue, index: number) => {
    const monthText = formatCalendar(month, {
      month: "short",
      year: "numeric",
    })
    const monthLabel = formatCalendar(month, {
      month: "long",
      year: "numeric",
    })
    const viewTriggerProps = pickerApi.getViewTriggerProps({ view: "day" })
    const isPeriodPanel = activePanelIndex === index && pickerApi.view !== "day"
    const isInactivePanel =
      activePanelIndex !== null && activePanelIndex !== index

    return (
      <div
        className={styles.monthPanel()}
        data-index={index}
        data-view={isPeriodPanel ? pickerApi.view : "day"}
        inert={isInactivePanel || undefined}
        key={index}
      >
        {isPeriodPanel ? (
          renderPeriodPanel(index)
        ) : (
          <>
            <div
              {...pickerApi.getViewControlProps({ view: "day" })}
              className={styles.viewControl()}
            >
              {renderPanelNavigationTrigger(index, -12, "month")}
              {renderPanelNavigationTrigger(index, -1, "day")}
              <Button
                {...viewTriggerProps}
                aria-label={`${viewTriggerProps["aria-label"]}: ${monthLabel}`}
                className={styles.viewTrigger()}
                id={`${viewTriggerProps.id}-${index}`}
                onClick={() => openPeriodChooser(index)}
                size="current"
                theme="unstyled"
                title={monthLabel}
                type="button"
              >
                {monthText}
              </Button>
              {renderPanelNavigationTrigger(index, 1, "day")}
              {renderPanelNavigationTrigger(index, 12, "month")}
            </div>
            {renderDayView(month, index)}
          </>
        )}
      </div>
    )
  }

  return (
    <div
      {...props}
      className={styles.calendar({ className })}
      data-part="calendar"
      data-scope="date-picker"
      data-selection-mode={selectionMode}
      data-view={activePanelIndex === null ? "day" : pickerApi.view}
      ref={ref}
    >
      {panelMonths.map(renderDayPanel)}
    </div>
  )
}

export type DatePickerTimeControlProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  endLabel?: string
  ref?: Ref<HTMLDivElement>
  startLabel?: string
}

DatePicker.TimeControl = function DatePickerTimeControl({
  className,
  endLabel = "End time",
  ref,
  startLabel = "Start time",
  ...props
}: DatePickerTimeControlProps) {
  const {
    coordinator,
    granularity,
    hideTimeZone,
    hourCycle,
    isTimed,
    pickerApi,
    selectionMode,
    setDraftTimePart,
    validationMessage,
    validationMessageId,
    styles,
  } = useDatePickerContext()

  if (!isTimed) {
    return null
  }

  const visibleParts: Array<{
    label: string
    part: DatePickerDraftTimePart
  }> = [
    { label: "Hour", part: "hour" },
    ...(granularity === "minute" || granularity === "second"
      ? [{ label: "Minute", part: "minute" as const }]
      : []),
    ...(granularity === "second"
      ? [{ label: "Second", part: "second" as const }]
      : []),
  ]
  const draftValues = toDateValues(coordinator.draft?.candidate)

  const renderTimeGroup = (
    index: DatePickerCandidateIndex,
    accessibleLabel: string
  ) => {
    const candidate = draftValues[index]
    const timeParts = getDatePickerDraftTimeParts(coordinator, hourCycle, index)
    const isDisabled = pickerApi.disabled || pickerApi.readOnly || !candidate
    const candidateTimeZone =
      !hideTimeZone && candidate && "timeZone" in candidate
        ? candidate.timeZone
        : null

    return (
      // biome-ignore lint/a11y/useSemanticElements: this labelled control group has no native fieldset layout; its children are individually labelled inputs.
      <div
        aria-label={accessibleLabel}
        className={styles.timeGroup()}
        data-index={index}
        role="group"
      >
        <span aria-hidden="true" className={styles.timeGroupLabel()}>
          {accessibleLabel}
        </span>
        <div className={styles.timeFields()}>
          {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each time part keeps bounded typing and keyboard adjustment together. */}
          {visibleParts.map(({ label, part }, partIndex) => {
            const hourMaximum = hourCycle === 12 ? 12 : 23
            const max = part === "hour" ? hourMaximum : 59
            const min = part === "hour" && hourCycle === 12 ? 1 : 0

            return (
              <Fragment key={part}>
                {partIndex > 0 ? (
                  <span aria-hidden="true" className={styles.timeSeparator()}>
                    :
                  </span>
                ) : null}
                <div className={styles.timeField()}>
                  <span className={styles.timeLabel()}>{label}</span>
                  <Input
                    aria-describedby={
                      validationMessage ? validationMessageId : undefined
                    }
                    aria-errormessage={
                      validationMessage ? validationMessageId : undefined
                    }
                    aria-invalid={Boolean(validationMessage) || undefined}
                    aria-label={
                      selectionMode === "range"
                        ? `${accessibleLabel} ${label.toLowerCase()}`
                        : label
                    }
                    className={styles.timeInput()}
                    disabled={isDisabled}
                    inputMode="numeric"
                    max={max}
                    min={min}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                      if (nextValue === "") {
                        setDraftTimePart(part, null, index)
                        return
                      }

                      const parsedValue = Number(nextValue)
                      if (
                        Number.isInteger(parsedValue) &&
                        parsedValue >= min &&
                        parsedValue <= max
                      ) {
                        setDraftTimePart(part, parsedValue, index)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (isDisabled) {
                        return
                      }
                      const current = timeParts[part]
                      let next: number
                      switch (event.key) {
                        case "ArrowUp":
                          next =
                            current == null || current >= max
                              ? min
                              : current + 1
                          break
                        case "ArrowDown":
                          next =
                            current == null || current <= min
                              ? max
                              : current - 1
                          break
                        case "Home":
                          next = min
                          break
                        case "End":
                          next = max
                          break
                        default:
                          return
                      }
                      event.preventDefault()
                      setDraftTimePart(part, next, index)
                    }}
                    placeholder="--"
                    readOnly={pickerApi.readOnly}
                    size="sm"
                    step={1}
                    type="number"
                    value={timeParts[part] ?? ""}
                  />
                </div>
              </Fragment>
            )
          })}
          {hourCycle === 12 ? (
            <div className={styles.timeField()}>
              <span className={styles.timeLabel()}>Day period</span>
              <select
                aria-label={
                  selectionMode === "range"
                    ? `${accessibleLabel} day period`
                    : "Day period"
                }
                className={styles.dayPeriod()}
                disabled={isDisabled}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value
                  setDraftTimePart(
                    "dayPeriod",
                    nextValue === "" ? null : Number(nextValue),
                    index
                  )
                }}
                value={timeParts.dayPeriod ?? ""}
              >
                <option value="">--</option>
                <option value="0">AM</option>
                <option value="12">PM</option>
              </select>
            </div>
          ) : null}
          {candidateTimeZone ? (
            <span className={styles.timeZone()} title={candidateTimeZone}>
              {candidateTimeZone}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: the frozen public part and ref contract use a div; children remain labelled controls.
    <div
      {...props}
      aria-label={
        props["aria-label"] ??
        (selectionMode === "single" ? "Time" : "Start and end times")
      }
      className={styles.timeControl({ className })}
      data-granularity={granularity}
      data-hour-cycle={hourCycle}
      data-part="time-control"
      data-scope="date-picker"
      data-selection-mode={selectionMode}
      ref={ref}
      role="group"
    >
      {renderTimeGroup(0, selectionMode === "range" ? startLabel : "Time")}
      {selectionMode === "range" ? renderTimeGroup(1, endLabel) : null}
    </div>
  )
}

export type DatePickerFooterProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

DatePicker.Footer = function DatePickerFooter({
  className,
  ref,
  ...props
}: DatePickerFooterProps) {
  const { styles } = useDatePickerContext()

  return (
    <div
      {...props}
      className={styles.footer({ className })}
      data-part="footer"
      data-scope="date-picker"
      ref={ref}
    />
  )
}

export type DatePickerCancelTriggerProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement>
}

DatePicker.CancelTrigger = function DatePickerCancelTrigger({
  children = "Cancel",
  className,
  onClick,
  ref,
  size: sizeProp,
  theme = "borderless",
  type = "button",
  variant = "secondary",
  ...props
}: DatePickerCancelTriggerProps) {
  const { requestOpen, size, styles } = useDatePickerContext()
  const actionSize = sizeProp ?? (size === "lg" ? "md" : "sm")
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented) {
      requestOpen(false)
    }
  }

  return (
    <Button
      {...props}
      className={styles.cancelTrigger({ className })}
      data-part="cancel-trigger"
      data-scope="date-picker"
      onClick={handleClick}
      ref={ref}
      size={actionSize}
      theme={theme}
      type={type}
      variant={variant}
    >
      {children}
    </Button>
  )
}

export type DatePickerConfirmTriggerProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement>
}

DatePicker.ConfirmTrigger = function DatePickerConfirmTrigger({
  children = "Confirm",
  className,
  disabled,
  onClick,
  ref,
  size: sizeProp,
  theme = "solid",
  type = "button",
  variant = "primary",
  ...props
}: DatePickerConfirmTriggerProps) {
  const { canConfirm, size, styles, submitDraft } = useDatePickerContext()
  const actionSize = sizeProp ?? (size === "lg" ? "md" : "sm")
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented) {
      submitDraft()
    }
  }

  return (
    <Button
      {...props}
      className={styles.confirmTrigger({ className })}
      data-part="confirm-trigger"
      data-scope="date-picker"
      disabled={disabled || !canConfirm}
      onClick={handleClick}
      ref={ref}
      size={actionSize}
      theme={theme}
      type={type}
      variant={variant}
    >
      {children}
    </Button>
  )
}

export type DatePickerStatusTextProps = StatusTextProps

DatePicker.StatusText = function DatePickerStatusText({
  id: providedId,
  status,
  size: sizeProp,
  ...props
}: DatePickerStatusTextProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const { descriptions, errorDescriptions, dateInputApi, size } =
    useDatePickerContext()
  const resolvedStatus = status ?? (dateInputApi.invalid ? "error" : "default")
  useRegisterDescription(id, descriptions.registerDescription)
  useEffect(
    () =>
      resolvedStatus === "error"
        ? errorDescriptions.registerDescription(id)
        : undefined,
    [id, resolvedStatus, errorDescriptions.registerDescription]
  )
  return (
    <StatusText
      {...props}
      id={id}
      showIcon={resolvedStatus === "default" ? props.showIcon : true}
      size={sizeProp ?? size}
      status={resolvedStatus}
    />
  )
}

DatePicker.Root = DatePicker
DatePicker.displayName = "DatePicker"
