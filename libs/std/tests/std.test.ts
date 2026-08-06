import { describe, expect, it, vi } from "vitest"

import { chunk, unique } from "../src/array.js"
import { sleep } from "../src/async.js"
import { assertNever, debounce } from "../src/function.js"
import { clamp } from "../src/number.js"
import {
  compactRecord,
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
  })

  it("chunks values and rejects invalid sizes", () => {
    expect(chunk([1, 2, 3], 2)).toStrictEqual([[1, 2], [3]])
    expect(() => chunk([1], 0)).toThrow(RangeError)
  })
})

describe("object utilities", () => {
  it("accepts non-array objects only", () => {
    expect(isRecord({ value: 1 })).toBeTruthy()
    expect(isRecord([])).toBeFalsy()
    expect(isRecord(null)).toBeFalsy()
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

  it("compacts undefined values and omits selected keys", () => {
    expect(compactRecord({ a: 1, b: undefinedValue, c: null })).toStrictEqual({
      a: 1,
      c: null,
    })
    expect(omitKeys({ a: 1, b: 2 }, ["b"])).toStrictEqual({ a: 1 })
    expect(omitUndefined({ a: 1, b: undefinedValue, c: null })).toStrictEqual({
      a: 1,
      c: null,
    })
  })

  it("normalizes error messages", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom")
    expect(getErrorMessage("boom")).toBe("boom")
  })
})

describe("string utilities", () => {
  it("normalizes present and non-empty strings", () => {
    expect(hasTrimmedString(" value ")).toBeTruthy()
    expect(normalizeTrimmedString(" value ")).toBe("value")
    expect(normalizeTrimmedString("  ")).toBeUndefined()
    expect(normalizePresentTrimmedString("  ")).toBe("")
  })

  it("creates stable slugs", () => {
    expect(slugify("  Hello,  World!  ")).toBe("hello-world")
  })
})

describe("control utilities", () => {
  it("clamps numbers and rejects reversed ranges", () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(() => clamp(1, 2, 0)).toThrow(RangeError)
  })

  it("debounces callbacks", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(value: number) => void>()
    const debounced = debounce(callback, 10)
    debounced(1)
    debounced(2)
    void vi.advanceTimersByTime(10)
    expect(callback).toHaveBeenCalledExactlyOnceWith(2)
    vi.useRealTimers()
  })

  it("sleeps and rejects invalid durations", async () => {
    vi.useFakeTimers()
    const result = sleep(10)
    await vi.advanceTimersByTimeAsync(10)
    await expect(result).resolves.toBeUndefined()
    await expect(sleep(-1)).rejects.toThrow(RangeError)
    vi.useRealTimers()
  })

  it("throws for impossible values", () => {
    expect(() => {
      Reflect.apply(assertNever, null, ["bad"])
    }).toThrow("Unexpected value: bad")
  })
})
