import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchListing: vi.fn(),
  resolveBinding: vi.fn(),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: mocks.resolveBinding,
}))

vi.mock("@/lib/storefront/blog-query-state.server", () => ({
  loadBlogQueryState: () => ({ category: undefined, page: 1 }),
}))

vi.mock("@/lib/storefront/cms", () => ({
  fetchCmsBlogListing: mocks.fetchListing,
}))

import { GET } from "./route"

const MARKET_CASES = [
  ["herbatica.sk", "sk", "sk-SK", "Zoznam článkov je dočasne nedostupný."],
  ["herbatica.cz", "cz", "cs-CZ", "Seznam článků je dočasně nedostupný."],
  [
    "herbatica.hu",
    "hu",
    "hu-HU",
    "A blogbejegyzések listája átmenetileg nem érhető el.",
  ],
  [
    "herbatica.ro",
    "ro",
    "ro-RO",
    "Lista articolelor este temporar indisponibilă.",
  ],
] as const

const requestFor = (host: string) =>
  new Request(`https://${host}/api/blog`, { headers: { host } })

describe("blog listing API localization", () => {
  afterEach(() => {
    mocks.fetchListing.mockReset()
    mocks.resolveBinding.mockReset()
    vi.restoreAllMocks()
  })

  it.each(
    MARKET_CASES
  )("localizes temporary failure from %s", async (host, market, locale, message) => {
    mocks.resolveBinding.mockReturnValue({ locale, market })
    mocks.fetchListing.mockRejectedValue(
      new Error("private CMS credential failure")
    )
    vi.spyOn(console, "error").mockImplementation(() => {
      // Expected CMS failure is intentionally silent in this route test.
    })

    const response = await GET(requestFor(host))

    expect(response.status).toBe(502)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    await expect(response.json()).resolves.toEqual({ message })
    expect(mocks.fetchListing).toHaveBeenCalledWith(
      expect.objectContaining({ locale })
    )
  })

  it("returns a generic 421 for an unknown Host", async () => {
    mocks.resolveBinding.mockReturnValue(null)

    const response = await GET(requestFor("unknown.example"))

    expect(response.status).toBe(421)
    await expect(response.json()).resolves.toEqual({
      message: "Misdirected request",
    })
    expect(mocks.fetchListing).not.toHaveBeenCalled()
  })
})
