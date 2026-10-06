import type {
  CalendarDateTime,
  DateValue,
  ZonedDateTime,
} from "@internationalized/date"
import { Time, toCalendarDateTime } from "@internationalized/date"

export type DatePickerCandidate = DateValue | readonly DateValue[] | null
export type DatePickerCandidateIndex = 0 | 1
export type DatePickerDraftTimePart = "hour" | "minute" | "second" | "dayPeriod"
export type DatePickerDraftTimeParts = Partial<
  Record<DatePickerDraftTimePart, number | null>
>
export type DatePickerTimeGranularity = "hour" | "minute" | "second"

export type DatePickerDraft = {
  baseline: DatePickerCandidate
  candidate: DatePickerCandidate
  timeGranularity?: DatePickerTimeGranularity
  timeHourCycle?: 12 | 24
  timeParts?: Partial<
    Record<DatePickerCandidateIndex, DatePickerDraftTimeParts>
  >
}

export type DatePickerCoordinatorState = {
  draft: DatePickerDraft | null
}

export type DatePickerCoordinatorAction =
  | { type: "open"; value: DatePickerCandidate }
  | { type: "edit"; value: DatePickerCandidate }
  | {
      type: "edit-time"
      granularity: DatePickerTimeGranularity
      hourCycle?: 12 | 24
      index?: DatePickerCandidateIndex
      part: DatePickerDraftTimePart
      value: number | null
    }
  | { type: "resync"; value: DatePickerCandidate }
  | { type: "discard" }

export function createDatePickerCoordinatorState(): DatePickerCoordinatorState {
  return { draft: null }
}

export function datePickerCoordinatorReducer(
  state: DatePickerCoordinatorState,
  action: DatePickerCoordinatorAction
): DatePickerCoordinatorState {
  if (action.type === "open" || action.type === "resync") {
    return {
      draft: {
        baseline: action.value,
        candidate: action.value,
      },
    }
  }

  if (action.type === "edit" && state.draft) {
    return {
      draft: {
        ...state.draft,
        candidate: action.value,
        timeParts: action.value === null ? undefined : state.draft.timeParts,
      },
    }
  }

  if (action.type === "edit-time" && state.draft?.candidate) {
    const index = action.index ?? 0
    const hourCycle = action.hourCycle ?? 24
    const timeParts = {
      ...getDatePickerDraftTimeParts(state, hourCycle, index),
      [action.part]: action.value,
    }
    const requiredParts = getRequiredTimeParts(action.granularity, hourCycle)
    const isComplete = requiredParts.every(
      (part) => typeof timeParts[part] === "number"
    )
    let candidate = state.draft.candidate
    const endpoint = getCandidateAt(candidate, index)

    if (isComplete && endpoint) {
      const time = {
        hour:
          hourCycle === 12
            ? ((timeParts.hour ?? 12) % 12) + (timeParts.dayPeriod ?? 0)
            : (timeParts.hour ?? 0),
        minute: timeParts.minute ?? 0,
        second: timeParts.second ?? 0,
      }
      const timedEndpoint = isTimedDateValue(endpoint)
        ? endpoint.set(time)
        : toCalendarDateTime(
            endpoint,
            new Time(time.hour, time.minute, time.second)
          )
      candidate = setCandidateAt(candidate, index, timedEndpoint)
    }

    return {
      draft: {
        ...state.draft,
        candidate,
        timeGranularity: action.granularity,
        timeHourCycle: hourCycle,
        timeParts: {
          ...state.draft.timeParts,
          [index]: timeParts,
        },
      },
    }
  }

  if (action.type === "discard") {
    return createDatePickerCoordinatorState()
  }

  return state
}

function getCandidateAt(
  candidate: DatePickerCandidate | undefined,
  index: DatePickerCandidateIndex
) {
  if (isCandidateArray(candidate)) {
    return candidate[index]
  }

  return index === 0 ? candidate : undefined
}

function setCandidateAt(
  candidate: DateValue | readonly DateValue[],
  index: DatePickerCandidateIndex,
  value: DateValue
): DateValue | readonly DateValue[] {
  if (!isCandidateArray(candidate)) {
    return index === 0 ? value : candidate
  }

  const nextCandidate = [...candidate]
  nextCandidate[index] = value
  return nextCandidate
}

function candidateValues(candidate: DatePickerCandidate | undefined) {
  if (isCandidateArray(candidate)) {
    return candidate
  }

  return candidate ? [candidate] : []
}

function isCandidateArray(
  candidate: DatePickerCandidate | undefined
): candidate is readonly DateValue[] {
  return Array.isArray(candidate)
}

function dateValuesEqual(
  left: DatePickerCandidate,
  right: DatePickerCandidate
) {
  const leftValues = candidateValues(left)
  const rightValues = candidateValues(right)
  return (
    leftValues.length === rightValues.length &&
    leftValues.every(
      (value, index) => value.toString() === rightValues[index]?.toString()
    )
  )
}

export function isDatePickerDraftDirty(state: DatePickerCoordinatorState) {
  if (!state.draft) {
    return false
  }

  return (
    !dateValuesEqual(state.draft.baseline, state.draft.candidate) ||
    areDraftTimePartsDirty(state.draft)
  )
}

export function canConfirmDatePickerDraft(
  state: DatePickerCoordinatorState,
  isTimeUnavailable?: (
    value: CalendarDateTime | ZonedDateTime,
    index: DatePickerCandidateIndex
  ) => boolean
) {
  if (!isDatePickerDraftDirty(state)) {
    return false
  }

  const candidate = state.draft?.candidate
  if (candidate === null) {
    return true
  }

  const values = candidateValues(candidate)
  if (isCandidateArray(candidate) && values.length !== 2) {
    return false
  }

  const [startValue, endValue] = values
  if (startValue && endValue && startValue.compare(endValue) > 0) {
    return false
  }

  const timedValues = values.filter(isTimedDateValue)
  if (timedValues.length !== values.length) {
    return false
  }

  const firstTimedValue = timedValues[0]
  const secondTimedValue = timedValues[1]
  if (
    firstTimedValue &&
    secondTimedValue &&
    "timeZone" in firstTimedValue !== "timeZone" in secondTimedValue
  ) {
    return false
  }

  return timedValues.every((value, index) => {
    if (index > 1) {
      return false
    }
    const candidateIndex: DatePickerCandidateIndex = index === 0 ? 0 : 1

    if (
      state.draft?.timeGranularity &&
      !getRequiredTimeParts(
        state.draft.timeGranularity,
        state.draft.timeHourCycle
      ).every(
        (part) =>
          typeof getDatePickerDraftTimeParts(
            state,
            state.draft?.timeHourCycle,
            candidateIndex
          )[part] === "number"
      )
    ) {
      return false
    }

    return !(isTimeUnavailable?.(value, candidateIndex) ?? false)
  })
}

export function isTimedDateValue(
  value: DateValue | null | undefined
): value is CalendarDateTime | ZonedDateTime {
  return value !== null && value !== undefined && "hour" in value
}

export function getDatePickerDraftTimeParts(
  state: DatePickerCoordinatorState,
  hourCycle: 12 | 24 = 24,
  index: DatePickerCandidateIndex = 0
): DatePickerDraftTimeParts {
  const candidate = getCandidateAt(state.draft?.candidate, index)
  const candidateParts = isTimedDateValue(candidate)
    ? {
        dayPeriod:
          hourCycle === 12 ? (candidate.hour >= 12 ? 12 : 0) : undefined,
        hour: hourCycle === 12 ? candidate.hour % 12 || 12 : candidate.hour,
        minute: candidate.minute,
        second: candidate.second,
      }
    : {}

  return { ...candidateParts, ...state.draft?.timeParts?.[index] }
}

function getRequiredTimeParts(
  granularity: DatePickerTimeGranularity,
  hourCycle: 12 | 24 = 24
): DatePickerDraftTimePart[] {
  const hourParts: DatePickerDraftTimePart[] =
    hourCycle === 12 ? ["hour", "dayPeriod"] : ["hour"]

  if (granularity === "hour") {
    return hourParts
  }
  if (granularity === "minute") {
    return [...hourParts, "minute"]
  }
  return [...hourParts, "minute", "second"]
}

function areDraftTimePartsDirty(draft: DatePickerDraft) {
  if (!draft.timeParts) {
    return false
  }

  const indices: readonly DatePickerCandidateIndex[] = [0, 1]
  const parts: readonly DatePickerDraftTimePart[] = [
    "hour",
    "minute",
    "second",
    "dayPeriod",
  ]

  return indices.some((index) => {
    const timeParts = draft.timeParts?.[index]
    if (!timeParts) {
      return false
    }

    const baseline = getCandidateAt(draft.baseline, index)
    const baselineParts: DatePickerDraftTimeParts = isTimedDateValue(baseline)
      ? {
          dayPeriod:
            draft.timeHourCycle === 12
              ? baseline.hour >= 12
                ? 12
                : 0
              : undefined,
          hour:
            draft.timeHourCycle === 12
              ? baseline.hour % 12 || 12
              : baseline.hour,
          minute: baseline.minute,
          second: baseline.second,
        }
      : {}

    return parts.some(
      (part) =>
        Object.hasOwn(timeParts, part) &&
        baselineParts[part] !== timeParts[part]
    )
  })
}
