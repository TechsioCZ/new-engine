import { afterEach, describe, expect, it, vi } from "vitest"

import { debounce } from "../../../../../src/admin/utils/debounce"

describe("admin debounce", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("invokes the callback once with the latest arguments", () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const debounced = debounce(callback, 500)

    debounced("first")
    debounced("second")
    vi.advanceTimersByTime(500)

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith("second")
  })

  it("cancels a pending invocation", () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const debounced = debounce(callback, 500)

    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(500)

    expect(callback).not.toHaveBeenCalled()
  })

  it("treats zero as a valid timer ID", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    vi.spyOn(globalThis, "setTimeout").mockReturnValue(0 as never)
    const debounced = debounce(vi.fn(), 500)

    debounced("first")
    debounced("second")

    expect(clearTimeoutSpy).toHaveBeenCalledWith(0)
  })
})
