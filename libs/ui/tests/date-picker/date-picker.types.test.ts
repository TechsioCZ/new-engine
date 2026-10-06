import {
  CalendarDateTime,
  parseZonedDateTime,
  type CalendarDate,
  type ZonedDateTime,
} from "@internationalized/date"
import { describe, expectTypeOf, it } from "vitest"
import type {
  DatePickerDayRootProps,
  DatePickerDayRangeRootProps,
  DatePickerRange,
  DatePickerRootProps,
  DatePickerTimedRange,
  DatePickerTimedRangeRootProps,
  DatePickerTimedRootProps,
  DatePickerTimedValue,
  DatePickerValueChangeDetails,
} from "../../src/molecules/date-picker"

describe("DatePicker public value contract", () => {
  it("keeps date-only values separate from timed values", () => {
    expectTypeOf<DatePickerDayRootProps["value"]>().toEqualTypeOf<
      CalendarDate | null | undefined
    >()
    expectTypeOf<DatePickerTimedRootProps["value"]>().toEqualTypeOf<
      CalendarDateTime | ZonedDateTime | null | undefined
    >()
    expectTypeOf<DatePickerTimedValue>().toEqualTypeOf<
      CalendarDateTime | ZonedDateTime
    >()
  })

  it("reports a typed scalar value and canonical string", () => {
    expectTypeOf<DatePickerValueChangeDetails<CalendarDate>>().toEqualTypeOf<{
      value: CalendarDate | null
      valueAsString: string
    }>()
  })

  it("reports complete date and timed ranges as readonly tuples", () => {
    expectTypeOf<DatePickerDayRangeRootProps["value"]>().toEqualTypeOf<
      DatePickerRange<CalendarDate> | null | undefined
    >()
    expectTypeOf<DatePickerTimedRangeRootProps["value"]>().toEqualTypeOf<
      DatePickerTimedRange | null | undefined
    >()
    expectTypeOf<
      DatePickerValueChangeDetails<DatePickerRange<CalendarDate>>
    >().toEqualTypeOf<{
      value: DatePickerRange<CalendarDate> | null
      valueAsString: DatePickerRange<string>
    }>()
  })

  it("does not allow a time predicate in day mode", () => {
    expectTypeOf<
      DatePickerDayRootProps["isTimeUnavailable"]
    >().toEqualTypeOf<undefined>()
  })

  it("rejects cross-mode values and mixed timed range kinds", () => {
    const timedValue = new CalendarDateTime(2026, 9, 3, 10, 30)

    const invalidDayValue: DatePickerDayRootProps = {
      children: null,
      granularity: "day",
      // @ts-expect-error A date-only root cannot accept a timed canonical value.
      value: timedValue,
    }

    // @ts-expect-error Timed roots require an explicit timed granularity.
    const invalidTimedGranularity: DatePickerTimedRootProps = {
      children: null,
      value: timedValue,
    }

    expectTypeOf(invalidDayValue).toMatchTypeOf<DatePickerDayRootProps>()
    expectTypeOf(
      invalidTimedGranularity
    ).toMatchTypeOf<DatePickerTimedRootProps>()

    const zonedValue = parseZonedDateTime("2026-09-03T10:30[Europe/Prague]")
    const invalidMixedTimedRange: DatePickerTimedRangeRootProps = {
      children: null,
      granularity: "minute",
      selectionMode: "range",
      // @ts-expect-error Timed range endpoints must share floating or zoned semantics.
      value: [timedValue, zonedValue],
    }

    expectTypeOf(invalidMixedTimedRange).toMatchTypeOf<DatePickerRootProps>()
  })
})
