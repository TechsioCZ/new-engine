import {
  DateFormatter,
  type DateValue,
  toCalendarDate,
  toTimeZone,
} from "@internationalized/date"
import type { Ref } from "react"

export function composeDatePickerRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (value: T | null) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") {
        const cleanup = ref(value)
        return typeof cleanup === "function" ? cleanup : () => ref(null)
      }
      if (ref) {
        ref.current = value
      }
      return () => {
        if (ref) {
          ref.current = null
        }
      }
    })
    return () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
    }
  }
}

/** Normalize an instant before deriving calendar coordinates or editing its clock. */
export function normalizeDatePickerTimeZone(
  value: DateValue,
  timeZone: string
) {
  return "timeZone" in value ? toTimeZone(value, timeZone) : value
}

/** Calendar cells are dates, not instants whose clock can cross a month boundary. */
export function getDatePickerCalendarDate(value: DateValue, timeZone: string) {
  return toCalendarDate(normalizeDatePickerTimeZone(value, timeZone))
}

export function formatDatePickerCalendar(
  value: DateValue,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) {
  return new DateFormatter(locale, {
    ...options,
    calendar: value.calendar.identifier,
    timeZone,
  }).format(value.toDate(timeZone))
}

export function normalizeDatePickerDigits(text: string, locale: string) {
  const formatter = new Intl.NumberFormat(locale, { useGrouping: false })
  const digits = Array.from({ length: 10 }, (_, number) =>
    formatter.format(number)
  )
  return Array.from(text, (character) => {
    const index = digits.indexOf(character)
    return index < 0 ? character : String(index)
  }).join("")
}
