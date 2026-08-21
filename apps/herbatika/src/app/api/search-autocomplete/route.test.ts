import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchSearchAutocomplete: vi.fn(),
  resolveMarketBinding: vi.fn(),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: mocks.resolveMarketBinding,
}))
vi.mock("@/lib/search-autocomplete/search-autocomplete.server", () => ({
  fetchSearchAutocomplete: mocks.fetchSearchAutocomplete,
}))

import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { GET } from "./route"

const RESPONSE = {
  brands: [],
  categories: [],
  content: [],
  products: [],
  query: "herbs",
}

const MARKET_CASES = [
  {
    countryCode: "SK",
    currencyCode: "EUR",
    host: "herbatica.sk",
    locale: "sk-SK",
    market: "sk",
  },
  {
    countryCode: "CZ",
    currencyCode: "CZK",
    host: "herbatica.cz",
    locale: "cs-CZ",
    market: "cz",
  },
  {
    countryCode: "HU",
    currencyCode: "HUF",
    host: "herbatica.hu",
    locale: "hu-HU",
    market: "hu",
  },
  {
    countryCode: "RO",
    currencyCode: "RON",
    host: "herbatica.ro",
    locale: "ro-RO",
    market: "ro",
  },
] as const

const bindingFor = (
  marketCase: (typeof MARKET_CASES)[number]
): MarketRuntimeBinding => ({
  acceptedHosts: [marketCase.host],
  canonicalOrigin: `https://${marketCase.host}`,
  countryCode: marketCase.countryCode,
  locale: marketCase.locale,
  market: marketCase.market,
  publishableApiKey: `pk_${marketCase.market}`,
  publishableApiKeyId: `pkid_${marketCase.market}`,
  regionId: `reg_${marketCase.market}`,
  salesChannelId: `sc_${marketCase.market}`,
})

const requestFor = (host: string, search = "q=herbs") =>
  new Request(`https://internal/api/search-autocomplete?${search}`, {
    headers: {
      cookie: "herbatika_auth_session_token=private.session.token",
      host,
      "x-forwarded-host": "attacker.example",
    },
  })

describe("search autocomplete market authority", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchSearchAutocomplete.mockResolvedValue(RESPONSE)
    mocks.resolveMarketBinding.mockImplementation((host: string | null) => {
      const marketCase = MARKET_CASES.find(
        (candidate) => candidate.host === host
      )
      return marketCase ? bindingFor(marketCase) : null
    })
  })

  it.each(
    MARKET_CASES
  )("derives $market country, currency, locale, and region from $host", async (marketCase) => {
    const response = await GET(requestFor(marketCase.host))

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(response.headers.get("vary")).toBe("Host, Cookie")
    expect(mocks.resolveMarketBinding).toHaveBeenCalledWith(marketCase.host)
    expect(mocks.fetchSearchAutocomplete).toHaveBeenCalledWith({
      authToken: "private.session.token",
      countryCode: marketCase.countryCode.toLowerCase(),
      currencyCode: marketCase.currencyCode,
      locale: marketCase.locale,
      market: marketCase.market,
      query: "herbs",
      regionId: `reg_${marketCase.market}`,
    })
  })

  it("ignores a foreign market parameter set for a trusted host", async () => {
    const response = await GET(
      requestFor(
        "herbatica.sk",
        "q=herbs&country=CZ&currency=CZK&locale=cs-CZ&region=reg_cz"
      )
    )

    expect(response.status).toBe(200)
    expect(mocks.fetchSearchAutocomplete).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: "sk",
        currencyCode: "EUR",
        locale: "sk-SK",
        market: "sk",
        regionId: "reg_sk",
      })
    )
  })

  it("rejects an unknown Host before search and keeps the response private", async () => {
    const response = await GET(
      requestFor(
        "unknown.example",
        "q=herbs&country=RO&currency=RON&locale=ro-RO&region=reg_ro"
      )
    )

    expect(response.status).toBe(421)
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    )
    expect(response.headers.get("vary")).toBe("Host, Cookie")
    expect(mocks.fetchSearchAutocomplete).not.toHaveBeenCalled()
  })
})
