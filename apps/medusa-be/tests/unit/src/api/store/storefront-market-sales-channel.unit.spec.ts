import { beforeEach, describe, expect, it, vi } from "vitest"
import { storeCatalogProductsRoutesMiddlewares } from "../../../../../src/api/store/catalog/products/middlewares"
import { storeProductLocationAvailabilityRoutesMiddlewares } from "../../../../../src/api/store/products/[id]/location-availability/middlewares"
import { storeProductMarketScopeRoutesMiddlewares } from "../../../../../src/api/store/products/middlewares"
import {
  enforceExactStorefrontMarketSalesChannel,
  enforceExactStorefrontProductDetailMarketSalesChannel,
} from "../../../../../src/api/store/storefront-market-sales-channel"

const MARKETS = [
  {
    channelId: "sc_sk",
    country: "sk",
    domain: "herbatica.sk",
    locale: "sk-SK",
    market: "sk",
  },
  {
    channelId: "sc_cz",
    country: "cz",
    domain: "herbatica.cz",
    locale: "cs-CZ",
    market: "cz",
  },
  {
    channelId: "sc_hu",
    country: "hu",
    domain: "herbatica.hu",
    locale: "hu-HU",
    market: "hu",
  },
  {
    channelId: "sc_ro",
    country: "ro",
    domain: "herbatica.ro",
    locale: "ro-RO",
    market: "ro",
  },
] as const

type Market = (typeof MARKETS)[number]

const channelFor = (market: Market) => ({
  id: market.channelId,
  metadata: {
    storefront_notification_markets: {
      [market.market]: {
        country_code: market.country,
        locale: market.locale,
        market_code: market.market,
        store_name: "Herbatica",
        storefront_domain: market.domain,
      },
    },
  },
})

const createHarness = (
  market: Market = MARKETS[0],
  options?: {
    channels?: unknown[]
    locale?: string
    salesChannelIds?: unknown
  }
) => {
  const graph = vi.fn().mockResolvedValue({
    data: options?.channels ?? [channelFor(market)],
  })
  const next = vi.fn()
  const req = {
    filterableFields: {
      sales_channel_id: [market.channelId, "sc_attacker"],
    },
    headers: {
      "x-market": "attacker",
      "x-publishable-api-key": "pk_attacker",
    },
    locale: options && "locale" in options ? options.locale : market.locale,
    publishable_key_context: {
      sales_channel_ids:
        options && "salesChannelIds" in options
          ? options.salesChannelIds
          : [market.channelId],
    },
    scope: {
      resolve: vi.fn(() => ({ graph })),
    },
  }

  return { graph, market, next, req }
}

const invokeGuard = (harness: ReturnType<typeof createHarness>) =>
  enforceExactStorefrontMarketSalesChannel(
    harness.req as never,
    {} as never,
    harness.next
  )

describe("ordinary storefront market Sales Channel guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(
    MARKETS
  )("accepts only the exact $market publishable-key binding and overwrites caller unions", async (market) => {
    const harness = createHarness(market)

    await invokeGuard(harness)

    expect(harness.graph).toHaveBeenCalledExactlyOnceWith({
      entity: "sales_channel",
      fields: ["id", "metadata"],
      filters: { id: market.channelId },
      pagination: { take: 2 },
    })
    expect(harness.req.filterableFields.sales_channel_id).toEqual([
      market.channelId,
    ])
    expect(harness.next).toHaveBeenCalledOnce()
  })

  it.each([
    ["missing", undefined],
    ["empty", []],
    ["multiple", ["sc_sk", "sc_ro"]],
    ["duplicate", ["sc_sk", "sc_sk"]],
    ["blank", [" "]],
  ])("fails before any query for a %s channel scope", async (_label, value) => {
    const harness = createHarness(MARKETS[0], { salesChannelIds: value })

    await expect(invokeGuard(harness)).rejects.toThrow(
      "must bind exactly one Sales Channel"
    )
    expect(harness.graph).not.toHaveBeenCalled()
    expect(harness.next).not.toHaveBeenCalled()
  })

  it("fails before any query when locale has no canonical market", async () => {
    const harness = createHarness(MARKETS[0], { locale: "de-DE" })

    await expect(invokeGuard(harness)).rejects.toThrow(
      "has no canonical market authority"
    )
    expect(harness.graph).not.toHaveBeenCalled()
    expect(harness.next).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    "",
  ])("fails before any query when locale is %j", async (locale) => {
    const harness = createHarness(MARKETS[0], { locale })

    await expect(invokeGuard(harness)).rejects.toThrow("locale is required")
    expect(harness.graph).not.toHaveBeenCalled()
    expect(harness.next).not.toHaveBeenCalled()
  })

  it("rejects a channel bound to another market before product queries", async () => {
    const wrongMarketChannel = {
      ...channelFor(MARKETS[1]),
      id: MARKETS[0].channelId,
    }
    const harness = createHarness(MARKETS[0], {
      channels: [wrongMarketChannel],
    })

    await expect(invokeGuard(harness)).rejects.toThrow(
      "does not match the requested market"
    )
    expect(harness.graph).toHaveBeenCalledOnce()
    expect(harness.next).not.toHaveBeenCalled()
  })

  it("rejects a channel that unionizes multiple market bindings", async () => {
    const originalChannel = channelFor(MARKETS[0])
    const channel = {
      ...originalChannel,
      metadata: {
        storefront_notification_markets: {
          ...originalChannel.metadata.storefront_notification_markets,
          ro: {
            country_code: "ro",
            locale: "ro-RO",
            market_code: "ro",
            store_name: "Herbatica",
            storefront_domain: "herbatica.ro",
          },
        },
      },
    }
    const harness = createHarness(MARKETS[0], { channels: [channel] })

    await expect(invokeGuard(harness)).rejects.toThrow(
      "must bind exactly one canonical market"
    )
    expect(harness.next).not.toHaveBeenCalled()
  })

  it.each([
    ["missing", []],
    ["ambiguous", [channelFor(MARKETS[0]), channelFor(MARKETS[0])]],
  ])("rejects a %s Sales Channel authority result", async (_label, channels) => {
    const harness = createHarness(MARKETS[0], { channels })

    await expect(invokeGuard(harness)).rejects.toThrow(
      "could not be resolved exactly"
    )
    expect(harness.next).not.toHaveBeenCalled()
  })
})

describe("ordinary storefront transport registration", () => {
  it("guards catalog before Sales Channel filter middleware", () => {
    const [route] = storeCatalogProductsRoutesMiddlewares
    const guardIndex = route.middlewares.indexOf(
      enforceExactStorefrontMarketSalesChannel
    )

    expect(route.matcher).toBe("/store/catalog/products")
    expect(guardIndex).toBeGreaterThan(0)
    expect(guardIndex).toBeLessThan(route.middlewares.length - 1)
  })

  it("guards ordinary product list and detail transports", () => {
    expect(storeProductMarketScopeRoutesMiddlewares).toEqual([
      expect.objectContaining({
        matcher: "/store/products",
        middlewares: [enforceExactStorefrontMarketSalesChannel],
      }),
      expect.objectContaining({
        matcher: "/store/products/:id",
        middlewares: [enforceExactStorefrontProductDetailMarketSalesChannel],
      }),
    ])
  })

  it("guards location availability before Sales Channel filtering", () => {
    const [route] = storeProductLocationAvailabilityRoutesMiddlewares
    const guardIndex = route.middlewares.indexOf(
      enforceExactStorefrontMarketSalesChannel
    )

    expect(route.matcher).toBe("/store/products/:id/location-availability")
    expect(guardIndex).toBeGreaterThan(0)
    expect(guardIndex).toBeLessThan(route.middlewares.length - 1)
  })
})
