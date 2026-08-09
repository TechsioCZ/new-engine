import { afterEach, describe, expect, it, vi } from "vitest"

import type { AnalyticsAdapter } from "../src/core/types"
import { useAnalytics } from "../src/core/use-analytics"

describe("analytics owner", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("accepts a freshly allocated adapter array on each render", () => {
    const adapter: AnalyticsAdapter = { key: "test" }

    const first = useAnalytics({ adapters: [adapter] })
    const second = useAnalytics({ adapters: [adapter] })

    expect(second).not.toBe(first)
    expect(second.trackCustom("render").success).toBeTruthy()
  })

  it("observes mutations to a cached adapter array", () => {
    const firstTrack = vi.fn<(eventName: string) => boolean>(() => true)
    const secondTrack = vi.fn<(eventName: string) => boolean>(() => true)
    const firstAdapter: AnalyticsAdapter = {
      key: "first",
      trackCustom: firstTrack,
    }
    const secondAdapter: AnalyticsAdapter = {
      key: "second",
      trackCustom: secondTrack,
    }
    const adapters = [firstAdapter]

    const analytics = useAnalytics({ adapters, debug: false })
    adapters.push(secondAdapter)

    expect(useAnalytics({ adapters, debug: false })).toBe(analytics)
    expect(analytics.trackCustom("mutation")).toStrictEqual({
      results: { first: true, second: true },
      success: true,
    })
    expect(firstTrack).toHaveBeenCalledWith("mutation", undefined)
    expect(secondTrack).toHaveBeenCalledWith("mutation", undefined)
  })

  it("preserves duplicate keys, results, and debug diagnostics", () => {
    const firstTrack = vi.fn<(eventName: string) => boolean>(() => true)
    const secondTrack = vi.fn<(eventName: string) => boolean>(() => false)
    const adapters: AnalyticsAdapter[] = [
      { key: "duplicate", trackCustom: firstTrack },
      { key: "duplicate", trackCustom: secondTrack },
    ]
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const log = vi.spyOn(console, "log").mockImplementation(() => {})

    const result = useAnalytics({ adapters, debug: true }).trackCustom(
      "duplicate-event",
    )

    expect(result).toStrictEqual({
      results: { duplicate: true, "duplicate#2": false },
      success: false,
    })
    expect(warn).toHaveBeenCalledWith(
      '[Analytics] Duplicate adapter key detected: "duplicate". Results will be keyed as "duplicate#2".',
    )
    expect(log).toHaveBeenCalledWith(
      "[Analytics] trackCustom(duplicate-event) results:",
      { duplicate: true, "duplicate#2": false },
    )
  })

  it("keeps separate cached APIs for debug modes", () => {
    const adapter: AnalyticsAdapter = { key: "test" }
    const adapters = [adapter]

    const quiet = useAnalytics({ adapters, debug: false })
    const verbose = useAnalytics({ adapters, debug: true })

    expect(verbose).not.toBe(quiet)
    expect(useAnalytics({ adapters, debug: false })).toBe(quiet)
    expect(useAnalytics({ adapters, debug: true })).toBe(verbose)
  })
})
