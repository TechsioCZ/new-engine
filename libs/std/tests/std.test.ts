import { describe, expect, expectTypeOf, it, vi } from "vitest"

import { chunk, unique } from "../src/array.js"
import { sleep } from "../src/async.js"
import { assertNever, debounce, noop } from "../src/function.js"
import { clamp } from "../src/number.js"
import {
  getErrorMessage,
  getRecordValue,
  isRecord,
  omitKeys,
  omitUndefined,
  toPlainRecord,
} from "../src/object.js"
import {
  hasTrimmedString,
  normalizePresentTrimmedString,
  normalizeTrimmedString,
  slugify,
} from "../src/string.js"

const createUndefined = (): unknown => undefined
const undefinedValue = createUndefined()

describe("array utilities", () => {
  it("deduplicates while preserving order", () => {
    expect(unique([2, 1, 2, 3])).toStrictEqual([2, 1, 3])
    expect(unique([])).toStrictEqual([])
    expect(unique([Number.NaN, Number.NaN])).toStrictEqual([Number.NaN])
  })

  it("chunks values", () => {
    expect(chunk([1, 2, 3], 2)).toStrictEqual([[1, 2], [3]])
    expect(chunk([], 2)).toStrictEqual([])
    expect(chunk([1], 2)).toStrictEqual([[1]])
  })

  it("rejects invalid chunk sizes", () => {
    expect(() => chunk([1], 0)).toThrow(RangeError)
    expect(() => chunk([1], 1.5)).toThrow(RangeError)
    expect(() => chunk([1], Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe("object utilities", () => {
  it("accepts non-array objects only", () => {
    expect(isRecord({ value: 1 })).toBeTruthy()
    expect(isRecord(new Date(0))).toBeTruthy()
    expect(isRecord([])).toBeFalsy()
    expect(isRecord(null)).toBeFalsy()
    expect(isRecord(noop)).toBeFalsy()
  })

  it("returns records without copying them", () => {
    const record = { value: 1 }

    expect(toPlainRecord(record)).toBe(record)
    expect(toPlainRecord("value")).toBeUndefined()
  })

  it("reads record values without changing bracket-access semantics", () => {
    const record = {
      nullValue: null,
      undefinedValue,
      value: 42,
    }

    expect(getRecordValue(record, "value")).toBe(42)
    expect(getRecordValue(record, "nullValue")).toBeNull()
    expect(getRecordValue(record, "undefinedValue")).toBeUndefined()
    expect(getRecordValue(record, "absent")).toBeUndefined()
  })

  it("compacts undefined values without mutating the input", () => {
    const input = { a: 1, b: undefinedValue, c: null }
    const optionalValue =
      typeof undefinedValue === "string" ? undefinedValue : undefined
    const typedInput: { optional: string | undefined; required: number } = {
      optional: optionalValue,
      required: 1,
    }
    const compacted = omitUndefined(typedInput)

    expect(compacted).toStrictEqual({ required: 1 })
    expectTypeOf(compacted).toExtend<{
      required: number
      optional?: string
    }>()
    expect(omitUndefined(input)).toStrictEqual({ a: 1, c: null })
    expect(input).toHaveProperty("b", undefinedValue)
    expect(omitUndefined({ a: undefinedValue })).toStrictEqual({})
  })

  it("omits selected keys", () => {
    expect(omitKeys({ a: 1, b: 2 }, ["b"])).toStrictEqual({ a: 1 })
    expect(omitKeys({ a: 1 }, [])).toStrictEqual({ a: 1 })
  })

  it("normalizes error messages", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom")
    expect(getErrorMessage("boom")).toBe("boom")
    expect(getErrorMessage(null)).toBe("null")
    expect(getErrorMessage(undefinedValue)).toBe("undefined")
  })
})

describe("string utilities", () => {
  it("detects non-empty strings after trimming", () => {
    expect(hasTrimmedString(" value ")).toBeTruthy()
    expect(hasTrimmedString("\t\n")).toBeFalsy()
    expect(hasTrimmedString(42)).toBeFalsy()
  })

  it("normalizes present and non-empty strings", () => {
    expect(normalizeTrimmedString(" value ")).toBe("value")
    expect(normalizeTrimmedString("  ")).toBeUndefined()
    expect(normalizeTrimmedString(null)).toBeUndefined()
    expect(normalizePresentTrimmedString("  ")).toBe("")
    expect(normalizePresentTrimmedString(null)).toBeUndefined()
  })

  it("creates stable slugs", () => {
    expect(slugify("  Hello,  World!  ")).toBe("hello-world")
    expect(slugify("--Already---Dashed--")).toBe("already-dashed")
    expect(slugify("Český Krumlov")).toBe("esk-krumlov")
    expect(slugify("!? ")).toBe("")
  })
})

describe("control utilities", () => {
  it("clamps numbers and rejects reversed ranges", () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(5, 5, 5)).toBe(5)
    expect(clamp(Number.NaN, 0, 10)).toBeNaN()
    expect(() => clamp(1, 2, 0)).toThrow(RangeError)
  })

  it("debounces and reschedules calls with their latest arguments", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(value: number) => void>()
    const debounced = debounce(callback, 10)

    debounced(1)
    vi.advanceTimersByTime(9)
    expect(callback).not.toHaveBeenCalled()
    debounced(2)
    vi.advanceTimersByTime(10)
    expect(callback).toHaveBeenCalledExactlyOnceWith(2)
    vi.useRealTimers()
  })

  it("clears a zero-valued timer ID when rescheduling", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    vi.stubGlobal(
      "setTimeout",
      vi.fn<(...arguments_: Parameters<typeof setTimeout>) => number>(() => 0),
    )
    const debounced = debounce(vi.fn<(...arguments_: string[]) => void>(), 10)

    debounced("first")
    debounced("second")

    expect(clearTimeoutSpy).toHaveBeenCalledWith(0)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("cancels pending calls idempotently before and after firing", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(value: number) => void>()
    const debounced = debounce(callback, 10)

    debounced(1)
    debounced.cancel()
    debounced.cancel()
    vi.advanceTimersByTime(10)
    expect(callback).not.toHaveBeenCalled()

    debounced(2)
    vi.advanceTimersByTime(10)
    debounced.cancel()
    expect(callback).toHaveBeenCalledExactlyOnceWith(2)
    vi.useRealTimers()
  })

  it("preserves the callback receiver", () => {
    vi.useFakeTimers()
    const receivers: string[] = []
    const debounced = debounce(function recordReceiver(
      this: { id: string },
      value: string,
    ) {
      receivers.push(`${this.id}:${value}`)
    }, 10)

    Reflect.apply(debounced, { id: "owner" }, ["value"])
    vi.advanceTimersByTime(10)
    expect(receivers).toStrictEqual(["owner:value"])
    vi.useRealTimers()
  })

  it("sleeps and rejects invalid durations", async () => {
    vi.useFakeTimers()
    const result = sleep(10)
    await vi.advanceTimersByTimeAsync(10)
    await expect(result).resolves.toBeUndefined()

    const immediateResult = sleep(0)
    await vi.advanceTimersByTimeAsync(0)
    await expect(immediateResult).resolves.toBeUndefined()
    await expect(sleep(-1)).rejects.toThrow(RangeError)
    await expect(sleep(Number.NaN)).rejects.toThrow(RangeError)
    await expect(sleep(Number.POSITIVE_INFINITY)).rejects.toThrow(RangeError)
    vi.useRealTimers()
  })

  it("does nothing", () => {
    expect(noop).not.toThrow()
  })

  it("throws for impossible values", () => {
    expect(() => {
      Reflect.apply(assertNever, null, ["bad"])
    }).toThrow("Unexpected value: bad")
    expect(() => {
      Reflect.apply(assertNever, null, ["bad", "Invalid state"])
    }).toThrow("Invalid state: bad")
  })
})
