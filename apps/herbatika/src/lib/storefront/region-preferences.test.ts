import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getStoredRegionPreference,
  normalizeCountryCode,
  normalizeRegionId,
  persistRegionCookies,
  persistRegionPreference,
  REGION_COUNTRY_CODE_STORAGE_KEY,
  REGION_STORAGE_KEY,
} from "./region-preferences"

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>()

  return {
    clear: () => {
      values.clear()
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()].at(index) ?? null,
    get length() {
      return values.size
    },
    removeItem: (key) => {
      values.delete(key)
    },
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

describe("region preference persistence", () => {
  let localStorage: Storage

  beforeEach(() => {
    localStorage = createMemoryStorage()
    vi.stubGlobal("window", { localStorage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("normalizes supported region identifiers and country codes", () => {
    expect(normalizeRegionId(" reg_market1 ")).toBe("reg_market1")
    expect(normalizeRegionId("market1")).toBeNull()
    expect(normalizeCountryCode(" SK ")).toBe("sk")
    expect(normalizeCountryCode("SVK")).toBeNull()
  })

  it("persists local storage synchronously and posts normalized cookies", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      await Promise.resolve()
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)

    persistRegionPreference({
      country_code: " SK ",
      region_id: " reg_market1 ",
    })

    expect(localStorage.getItem(REGION_STORAGE_KEY)).toBe("reg_market1")
    expect(localStorage.getItem(REGION_COUNTRY_CODE_STORAGE_KEY)).toBe("sk")
    expect(getStoredRegionPreference()).toStrictEqual({
      country_code: "sk",
      region_id: "reg_market1",
    })

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/storefront-region",
      expect.objectContaining({
        body: JSON.stringify({
          countryCode: "sk",
          regionId: "reg_market1",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    )
    const requestInit = fetchMock.mock.calls[0]?.[1]
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal)
  })

  it("does not persist an invalid preference", () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      await Promise.resolve()
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)

    persistRegionPreference({ country_code: "SVK", region_id: "market1" })

    expect(localStorage).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reports a typed error when cookie persistence fails", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      await Promise.resolve()
      return new Response(null, { status: 503 })
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      persistRegionCookies({
        country_code: "sk",
        region_id: "reg_market1",
      }),
    ).rejects.toMatchObject({
      code: "REGION_PREFERENCE_PERSISTENCE_FAILED",
      status: 503,
    })
  })

  it("preserves fetch errors from cookie persistence", async () => {
    const fetchError = new TypeError("Network unavailable")
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(fetchError))

    await expect(
      persistRegionCookies({
        country_code: "sk",
        region_id: "reg_market1",
      }),
    ).rejects.toBe(fetchError)
  })
})
