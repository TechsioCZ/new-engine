/**
 * DatePicker — @techsio/ui-kit molecule.
 *
 * @component DatePicker
 * @componentVersion v1.1.0
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
  machine as dateInputMachine,
} from "@zag-js/date-input"
import {
  connect as connectDatePicker,
  machine as datePickerMachine,
  type PositioningOptions,
  type Api as ZagDatePickerApi,
} from "@zag-js/date-picker"
import { mergeProps, normalizeProps, Portal, useMachine } from "@zag-js/react"
import type {
  ComponentPropsWithoutRef,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from "react"
import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react"
import { Button, type ButtonProps } from "../atoms/button"
import { Input } from "../atoms/input"
import { Label } from "../atoms/label"
import {
  canConfirmDatePickerDraft,
  createDatePickerCoordinatorState,
  type DatePickerCandidate,
  type DatePickerCandidateIndex,
  type DatePickerCoordinatorState,
  type DatePickerDraftTimePart,
  datePickerCoordinatorReducer,
  getDatePickerDraftTimeParts,
} from "../internal/date-picker-coordinator"
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

const datePickerVariants = tv({
  slots: {
    root: "relative flex w-full flex-col gap-date-picker-root",
    label: "text-date-picker-label-fg",
    control: "w-full",
    inputControl: [
      "date-picker-control-focus date-picker-control-validation form-control-base flex w-full items-center gap-date-picker-control",
      "border-(length:--border-width-date-picker-control)",
      "border-date-picker-control-border bg-date-picker-control-bg text-date-picker-control-fg",
      "hover:border-date-picker-control-border-hover hover:bg-date-picker-control-bg-hover",
      "data-disabled:cursor-not-allowed data-disabled:border-date-picker-control-border-disabled",
      "data-disabled:bg-date-picker-control-bg-disabled data-disabled:text-date-picker-control-fg-disabled",
      "data-readonly:bg-date-picker-control-bg-readonly",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    segments: [
      "date-picker-scrollbar-hidden flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden outline-none",
      "data-disabled:overflow-hidden",
    ],
    segmentGroup: "flex min-w-0 items-center",
    rangeSeparator:
      "shrink-0 px-date-picker-range-separator text-date-picker-range-separator-fg",
    segment: [
      "date-picker-segment-size inline-flex shrink-0 items-center justify-center rounded-date-picker-day px-date-picker-segment tabular-nums outline-none",
      "data-placeholder-shown:text-date-picker-segment-fg-placeholder",
      "focus:bg-date-picker-segment-bg-focus",
      "data-[type=literal]:min-h-0 data-[type=literal]:min-w-0 data-[type=literal]:px-0 data-[type=literal]:text-date-picker-control-fg",
      "data-disabled:cursor-not-allowed data-readonly:cursor-default",
    ],
    indicatorGroup: "flex shrink-0 items-center gap-date-picker-indicator",
    trigger: [
      "date-picker-trigger-focus inline-flex shrink-0 items-center justify-center rounded-date-picker-day border-0 p-0",
      "bg-date-picker-trigger-bg text-date-picker-trigger-fg",
      "hover:bg-date-picker-trigger-bg-hover",
      "active:bg-date-picker-trigger-bg-active",
      "data-disabled:cursor-not-allowed data-disabled:text-date-picker-trigger-fg-disabled",
      "disabled:cursor-not-allowed disabled:bg-date-picker-control-bg-disabled disabled:text-date-picker-trigger-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    clearTrigger: [
      "date-picker-trigger-focus inline-flex shrink-0 items-center justify-center rounded-date-picker-day p-0",
      "text-date-picker-trigger-fg hover:bg-date-picker-trigger-bg-hover active:bg-date-picker-trigger-bg-active",
      "data-disabled:cursor-not-allowed data-disabled:text-date-picker-trigger-fg-disabled",
      "data-readonly:hidden",
      "disabled:cursor-not-allowed disabled:text-date-picker-trigger-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    positioner: "isolate z-(--z-index)",
    content: [
      "flex max-h-(--available-height) w-date-picker-content max-w-date-picker-viewport flex-col overflow-hidden",
      "data-[selection-mode=range]:w-date-picker-content-range",
      "border-(length:--border-width-date-picker-content) border-date-picker-content-border",
      "rounded-date-picker-content bg-date-picker-content-bg text-date-picker-content-fg shadow-date-picker-content",
      "outline-none duration-200 ease-out",
      "motion-safe:transition motion-reduce:transition-none",
      "starting:-translate-y-date-picker-enter-offset starting:opacity-0",
    ],
    calendar: [
      "grid min-h-0 grid-cols-1 gap-date-picker-calendar overflow-y-auto p-date-picker-content",
      "sm:data-[selection-mode=range]:grid-cols-2",
    ],
    monthPanel: [
      "grid min-w-0 content-start gap-date-picker-calendar",
      "sm:data-[index=1]:border-date-picker-month-divider-border sm:data-[index=1]:border-l sm:data-[index=1]:pl-date-picker-content",
    ],
    view: "min-w-0",
    viewControl:
      "flex min-w-0 items-center justify-between gap-date-picker-calendar",
    navigationTrigger: [
      "date-picker-navigation-focus size-date-picker-navigation shrink-0 rounded-date-picker-day p-0",
      "text-date-picker-navigation-fg hover:bg-date-picker-navigation-bg-hover",
      "disabled:cursor-not-allowed disabled:text-date-picker-navigation-fg-disabled",
    ],
    viewTrigger: [
      "date-picker-navigation-focus min-w-0 flex-1 truncate rounded-date-picker-day px-date-picker-calendar-cell",
      "font-date-picker-view text-date-picker-navigation-fg hover:bg-date-picker-navigation-bg-hover",
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
      "date-picker-day-focus border-(length:--border-width-date-picker-day) flex w-full items-center justify-center",
      "rounded-date-picker-day border-date-picker-day-border bg-date-picker-day-bg text-date-picker-day-fg",
      "hover:bg-date-picker-day-bg-hover",
      "data-today:border-date-picker-day-today-border",
      "data-in-range:rounded-none data-in-range:bg-date-picker-day-bg-range",
      "data-in-hover-range:rounded-none data-in-hover-range:bg-date-picker-day-bg-range-hover",
      "data-range-start:rounded-date-picker-day data-range-start:rounded-r-none",
      "data-range-end:rounded-date-picker-day data-range-end:rounded-l-none",
      "data-range-start:bg-date-picker-day-bg-selected data-range-end:bg-date-picker-day-bg-selected",
      "data-range-start:text-date-picker-day-fg-selected data-range-end:text-date-picker-day-fg-selected",
      "data-selected:bg-date-picker-day-bg-selected data-selected:text-date-picker-day-fg-selected",
      "data-selected:hover:bg-date-picker-day-bg-selected-hover",
      "data-unavailable:text-date-picker-day-fg-unavailable data-unavailable:line-through",
      "data-outside-range:opacity-date-picker-outside",
      "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-date-picker-disabled",
      "forced-colors:data-selected:outline-2",
      "forced-colors:data-disabled:opacity-date-picker-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    periodTrigger: [
      "date-picker-day-focus w-full rounded-date-picker-day p-date-picker-calendar-cell",
      "text-date-picker-day-fg hover:bg-date-picker-day-bg-hover",
      "data-selected:bg-date-picker-day-bg-selected data-selected:text-date-picker-day-fg-selected",
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
      "sm:data-[index=1]:border-l sm:data-[index=1]:border-t-0 sm:data-[index=1]:pt-0 sm:data-[index=1]:pl-date-picker-time",
    ],
    timeGroupLabel:
      "shrink-0 font-date-picker-view text-date-picker-time-label-fg text-date-picker-time-label",
    timeFields: "flex min-w-0 items-center gap-date-picker-indicator",
    timeField: "w-date-picker-time-field shrink-0",
    timeLabel: "sr-only",
    timeSeparator: "shrink-0 text-date-picker-time-label-fg tabular-nums",
    timeInput:
      "token-date-picker-time-input px-date-picker-time-input text-center tabular-nums",
    dayPeriod: [
      "date-picker-time-focus h-date-picker-time-field border-(length:--border-width-date-picker-time) rounded-date-picker-time text-date-picker-sm",
      "border-date-picker-time-border bg-date-picker-time-bg px-date-picker-calendar-cell text-date-picker-time-fg",
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
          "h-date-picker-control-sm rounded-date-picker-control-sm p-date-picker-segments-sm text-date-picker-sm",
        trigger: "size-icon-control-sm text-icon-control-sm",
        clearTrigger: "size-icon-control-sm text-icon-control-sm",
        content: "text-date-picker-sm",
        dayTrigger: "size-date-picker-day-sm",
        tableHeader: "h-date-picker-day-sm",
      },
      md: {
        inputControl:
          "h-date-picker-control-md rounded-date-picker-control-md p-date-picker-segments-md text-date-picker-md",
        trigger: "size-icon-control-md text-icon-control-md",
        clearTrigger: "size-icon-control-md text-icon-control-md",
        content: "text-date-picker-md",
        dayTrigger: "size-date-picker-day-md",
        tableHeader: "h-date-picker-day-md",
      },
      lg: {
        inputControl:
          "h-date-picker-control-lg rounded-date-picker-control-lg p-date-picker-segments-lg text-date-picker-lg",
        trigger: "size-icon-control-lg text-icon-control-lg",
        clearTrigger: "size-icon-control-lg text-icon-control-lg",
        content: "text-date-picker-lg",
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
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null)

function useDatePickerContext() {
  const context = useContext(DatePickerContext)

  if (!context) {
    throw new Error("DatePicker components must be used within DatePicker.Root")
  }

  return context
}

function setRefValue<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value)
    return
  }

  if (ref) {
    ref.current = value
  }
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

// biome-ignore lint/style/useUnifiedTypeSignatures: overloads preserve the granularity-discriminated public contract.
export function DatePicker(props: DatePickerDayRootProps): ReactElement
export function DatePicker(props: DatePickerTimedRootProps): ReactElement
export function DatePicker(props: DatePickerDayRangeRootProps): ReactElement
export function DatePicker(props: DatePickerTimedRangeRootProps): ReactElement
export function DatePicker({
  children,
  className,
  defaultOpen = false,
  defaultValue,
  disabled,
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
  max,
  min,
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
  const isTimed = granularity !== "day"
  const resolvedHourCycle =
    hourCycle ??
    (new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
      .hour12
      ? 12
      : 24)
  const [uncontrolledValue, setUncontrolledValue] =
    useState<DatePickerPublicValue | null>(() => defaultValue ?? null)
  const acceptedValue: DatePickerPublicValue | null =
    value === undefined ? uncontrolledValue : value
  const acceptedValues = toDateValues(acceptedValue)
  const acceptedScalarValue = acceptedValues[0] ?? null
  const acceptedCandidate: DatePickerCandidate =
    selectionMode === "range" ? acceptedValues : acceptedScalarValue
  const [rangeInputDraft, setRangeInputDraft] = useState<DateValue[] | null>(
    null
  )
  const usesPopupDraft = isTimed || selectionMode === "range"
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const resolvedOpen = open === undefined ? uncontrolledOpen : open
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
  const acceptedValuesAsString = acceptedValues.map((item) => item.toString())
  const acceptedValueKey = JSON.stringify(acceptedValueAsString)
  const previousAcceptedValue = useRef(acceptedValueKey)
  const previousOpen = useRef(resolvedOpen)
  const triggerElementRef = useRef<HTMLButtonElement>(null)
  const styles = datePickerVariants({ size, timed: isTimed })

  useEffect(() => {
    if (previousOpen.current === resolvedOpen) {
      return
    }

    previousOpen.current = resolvedOpen
    dispatch(
      resolvedOpen && usesPopupDraft
        ? { type: "open", value: acceptedCandidate }
        : { type: "discard" }
    )
  }, [acceptedCandidate, resolvedOpen, usesPopupDraft])

  useEffect(() => {
    if (previousAcceptedValue.current === acceptedValueKey) {
      return
    }

    previousAcceptedValue.current = acceptedValueKey
    setRangeInputDraft(null)
    if (usesPopupDraft && resolvedOpen) {
      dispatch({ type: "resync", value: acceptedCandidate })
    }
  }, [acceptedCandidate, acceptedValueKey, resolvedOpen, usesPopupDraft])

  const commitValue = (nextValue: DatePickerPublicValue | null) => {
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
    if (nextOpen === resolvedOpen) {
      return
    }

    const activeElement =
      !nextOpen && typeof document !== "undefined"
        ? document.activeElement
        : null
    const shouldRestoreFocus =
      activeElement instanceof HTMLElement &&
      Boolean(
        activeElement.closest('[data-scope="date-picker"][data-part="content"]')
      )

    if (open === undefined) {
      setUncontrolledOpen(nextOpen)
    }
    onOpenChange?.({ open: nextOpen })

    if (shouldRestoreFocus) {
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) {
          triggerElementRef.current?.focus({ preventScroll: true })
        }
      })
    }
  }

  const draftValue = coordinator.draft
    ? coordinator.draft.candidate
    : acceptedCandidate
  const pickerValues =
    usesPopupDraft && resolvedOpen ? toDateValues(draftValue) : acceptedValues
  const resolvedNumOfMonths = numOfMonths ?? (selectionMode === "range" ? 2 : 1)

  const pickerService = useMachine(datePickerMachine, {
    closeOnSelect: !isTimed,
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

  const dateInputService = useMachine(dateInputMachine, {
    disabled,
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
      if (selectionMode === "range") {
        setRangeInputDraft(details.value)
        if (resolvedOpen) {
          dispatch({ type: "edit", value: details.value })
        }

        const nextRange = toCompleteDatePickerRange(details.value)
        if (nextRange) {
          setRangeInputDraft(null)
          commitValue(nextRange)
          if (!isTimed) {
            requestOpen(false)
          }
        }
        return
      }

      commitValue(details.value[0] ?? null)
    },
    readOnly: readOnly || (isTimed && resolvedOpen),
    required,
    selectionMode,
    shouldForceLeadingZeros,
    timeZone,
    value:
      selectionMode === "range"
        ? (rangeInputDraft ?? acceptedValues)
        : acceptedValues,
  })
  const dateInputApi = connectDateInput(dateInputService, normalizeProps)

  const canConfirm = canConfirmDatePickerDraft(coordinator, isTimeUnavailable)
  const submitDraft = () => {
    if (!(canConfirm && coordinator.draft)) {
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
    if (disabled || readOnly) {
      return
    }

    setRangeInputDraft(null)
    if (isTimed && resolvedOpen) {
      dispatch({ type: "edit", value: null })
      return
    }

    commitValue(null)
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
          if (granularity !== "day") {
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
        setDraftValue: (nextValue) =>
          dispatch({ type: "edit", value: nextValue }),
        size,
        styles,
        submitDraft,
        triggerElementRef,
      }}
    >
      <div
        {...rootProps}
        className={styles.root({ className })}
        data-granularity={granularity}
        data-selection-mode={selectionMode}
        ref={ref}
      >
        {children}
        {selectionMode === "range" ? (
          <>
            <input
              disabled={disabled}
              form={form}
              name={startName}
              type="hidden"
              value={acceptedValuesAsString[0] ?? ""}
            />
            <input
              disabled={disabled}
              form={form}
              name={endName}
              type="hidden"
              value={acceptedValuesAsString[1] ?? ""}
            />
          </>
        ) : (
          <input
            disabled={disabled}
            form={form}
            name={name}
            type="hidden"
            value={acceptedValuesAsString[0] ?? ""}
          />
        )}
      </div>
    </DatePickerContext.Provider>
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
  const { dateInputApi, pickerApi, styles } = useDatePickerContext()
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
        data-validation={dateInputApi.invalid ? "error" : undefined}
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
  const { dateInputApi, selectionMode, styles } = useDatePickerContext()
  const startDescriptorId = useId()
  const endDescriptorId = useId()

  const renderSegments = (index: 0 | 1) =>
    dateInputApi.getSegments({ index }).map((segment, segmentIndex) => (
      <span
        {...dateInputApi.getSegmentProps({ index, segment })}
        className={styles.segment()}
        key={`${segment.type}-${segmentIndex}`}
      >
        {segment.text}
      </span>
    ))

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
        ref={ref}
      >
        <span className="sr-only" id={startDescriptorId}>
          {startLabel}
        </span>
        <div
          {...getRangeGroupLabelProps(0, startDescriptorId, startLabel)}
          className={styles.segmentGroup()}
        >
          {renderSegments(0)}
        </div>
        <span aria-hidden="true" className={styles.rangeSeparator()}>
          {separator}
        </span>
        <span className="sr-only" id={endDescriptorId}>
          {endLabel}
        </span>
        <div
          {...getRangeGroupLabelProps(1, endDescriptorId, endLabel)}
          className={styles.segmentGroup()}
        >
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
  const triggerProps = mergeProps(props, pickerApi.getTriggerProps())

  return (
    <Button
      {...triggerProps}
      aria-invalid={dateInputApi.invalid || undefined}
      className={styles.trigger({ className })}
      icon={icon ?? (children ? undefined : "token-icon-date-picker-calendar")}
      iconSize={iconSize}
      ref={(node) => {
        triggerElementRef.current = node
        setRefValue(ref, node)
      }}
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
    selectionMode,
    styles,
  } = useDatePickerContext()
  const createPanelMonths = () =>
    Array.from({ length: numOfMonths }, (_, index) =>
      pickerApi.visibleRange.start.add({ months: index }).set({ day: 1 })
    )
  const [panelMonths, setPanelMonths] = useState<DateValue[]>(createPanelMonths)
  const [activePanelIndex, setActivePanelIndex] = useState<number | null>(null)
  const acceptedValueKey = JSON.stringify(
    serializeDatePickerValue(acceptedValue)
  )
  const previousAcceptedValue = useRef(acceptedValueKey)
  const previousNumOfMonths = useRef(numOfMonths)
  const previousView = useRef(pickerApi.view)
  const focusedMonthKey = `${pickerApi.focusedValue.year}-${pickerApi.focusedValue.month}`
  const visibleRangeStartKey = pickerApi.visibleRange.start.toString()

  useEffect(() => {
    if (selectionMode !== "single") {
      return
    }

    setPanelMonths(createPanelMonths())
  }, [numOfMonths, selectionMode, visibleRangeStartKey])

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

  useEffect(() => {
    const returnedToDay =
      previousView.current !== "day" && pickerApi.view === "day"
    previousView.current = pickerApi.view

    if (!(returnedToDay && activePanelIndex !== null)) {
      return
    }

    const selectedMonth = pickerApi.focusedValue.set({ day: 1 })
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

    return (
      <Button
        {...machineProps}
        className={styles.navigationTrigger()}
        disabled={disabled}
        icon={
          isYearJump
            ? isPrevious
              ? "token-icon-date-picker-previous-year"
              : "token-icon-date-picker-next-year"
            : isPrevious
              ? "token-icon-date-picker-previous"
              : "token-icon-date-picker-next"
        }
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

    return (
      <div {...viewProps} className={styles.view()} hidden={false}>
        <table
          {...pickerApi.getTableProps({ id: `panel-${index}`, view: "day" })}
          className={styles.table()}
        >
          <thead {...pickerApi.getTableHeadProps({ view: "day" })}>
            <tr {...pickerApi.getTableRowProps({ view: "day" })}>
              {pickerApi.weekDays.map((weekDay) => (
                <th
                  {...pickerApi.getTableHeaderProps({ view: "day" })}
                  className={styles.tableHeader()}
                  key={weekDay.value.toString()}
                  scope="col"
                >
                  <abbr title={weekDay.long}>{weekDay.short}</abbr>
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
                      {...pickerApi.getDayTableCellTriggerProps({
                        value: day,
                        visibleRange,
                      })}
                      className={styles.dayTrigger()}
                      size="current"
                      theme="unstyled"
                      type="button"
                    >
                      {pickerApi.format(day, { day: "numeric" })}
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
    const monthText = pickerApi.format(month, {
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
                aria-label={`${viewTriggerProps["aria-label"]}: ${monthText}`}
                className={styles.viewTrigger()}
                id={`${viewTriggerProps.id}-${index}`}
                onClick={() => openPeriodChooser(index)}
                size="current"
                theme="unstyled"
                title={monthText}
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
        selectionMode === "single" ? (props["aria-label"] ?? "Time") : undefined
      }
      className={styles.timeControl({ className })}
      data-granularity={granularity}
      data-hour-cycle={hourCycle}
      data-part="time-control"
      data-scope="date-picker"
      data-selection-mode={selectionMode}
      ref={ref}
      role={selectionMode === "single" ? "group" : undefined}
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
  variant = "primary",
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

DatePicker.Root = DatePicker
DatePicker.displayName = "DatePicker"
