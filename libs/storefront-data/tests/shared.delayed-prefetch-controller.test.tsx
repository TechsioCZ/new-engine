import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDelayedPrefetchController } from "../src/shared/use-delayed-prefetch-controller"

describe("useDelayedPrefetchController", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("debounces scheduled callbacks with the same prefetch id", () => {
    const first = vi.fn()
    const second = vi.fn()

    const { result } = renderHook(() => useDelayedPrefetchController())

    act(() => {
      result.current.schedulePrefetch(first, "prefetch-id", 100)
      result.current.schedulePrefetch(second, "prefetch-id", 100)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it("cancels pending callback when cancelPrefetch is called", () => {
    const callback = vi.fn()

    const { result } = renderHook(() => useDelayedPrefetchController())

    act(() => {
      result.current.schedulePrefetch(callback, "prefetch-id", 100)
      result.current.cancelPrefetch("prefetch-id")
      vi.advanceTimersByTime(100)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it("cleans up pending callbacks on unmount", () => {
    const callback = vi.fn()

    const { result, unmount } = renderHook(() => useDelayedPrefetchController())

    act(() => {
      result.current.schedulePrefetch(callback, "prefetch-id", 100)
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).not.toHaveBeenCalled()
  })
})
