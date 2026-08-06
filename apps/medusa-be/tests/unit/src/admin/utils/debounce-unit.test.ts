import { afterEach, describe, expect, it, vi } from "vitest"

import { debounce } from "../../../../../src/admin/utils/debounce"

describe("admin debounce", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("invokes the callback once with the latest arguments", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
    const callback = vi.fn<(value: string) => void>()
    const debounced = debounce(callback, 500)

    debounced("first")
    debounced("second")
    await vi.advanceTimersByTimeAsync(500)

    expect(callback).toHaveBeenCalledExactlyOnceWith("second")
  })

  it("cancels a pending invocation", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
    const callback = vi.fn<() => void>()
    const debounced = debounce(callback, 500)

    debounced()
    debounced.cancel()
    await vi.advanceTimersByTimeAsync(500)

    expect(callback).not.toHaveBeenCalled()
  })

  it("treats zero as a valid timer ID", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    vi.stubGlobal(
      "setTimeout",
      vi.fn<(...arguments_: Parameters<typeof setTimeout>) => number>(() => 0),
    )
    const debounced = debounce(vi.fn<(...arguments_: string[]) => void>(), 500)

    debounced("first")
    debounced("second")

    expect(clearTimeoutSpy).toHaveBeenCalledWith(0)
  })
})
