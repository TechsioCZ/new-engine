import { describe, expect, it, vi } from "vitest"

import { chunk, unique } from "../src/array.js"
import { sleep } from "../src/async.js"
import { assertNever, debounce } from "../src/function.js"
import { clamp } from "../src/number.js"
import {
  compactRecord,
  getErrorMessage,
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

describe("array utilities", () => {
  it("deduplicates while preserving order", () => {
    expect(unique([2, 1, 2, 3])).toEqual([2, 1, 3])
  })

  it("chunks values and rejects invalid sizes", () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]])
    expect(() => chunk([1], 0)).toThrow(RangeError)
  })
})

describe("object utilities", () => {
  it("accepts non-array objects only", () => {
    expect(isRecord({ value: 1 })).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(toPlainRecord("value")).toBeUndefined()
  })

  it("compacts undefined values and omits selected keys", () => {
    expect(compactRecord({ a: 1, b: undefined, c: null })).toEqual({
      a: 1,
      c: null,
    })
    expect(omitKeys({ a: 1, b: 2 }, ["b"])).toEqual({ a: 1 })
    expect(omitUndefined({ a: 1, b: undefined, c: null })).toEqual({
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
    expect(hasTrimmedString(" value ")).toBe(true)
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
    const callback = vi.fn()
    const debounced = debounce(callback, 10)
    debounced(1)
    debounced(2)
    vi.advanceTimersByTime(10)
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith(2)
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
    expect(() => assertNever("bad" as never)).toThrow("Unexpected value: bad")
  })
})
