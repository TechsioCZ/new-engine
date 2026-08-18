import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"
import { resolveNotificationMarketContext } from "../../src/utils/notification-market-context"

type MarketCode = "cz" | "hu" | "ro" | "sk"

type RegionFixture = {
  countries?: Array<{ iso_2: string }>
  id: string
}

type SalesChannelFixture = {
  id: string
  metadata?: Record<string, unknown>
}

const MARKET_FIXTURES = {
  sk: {
    locale: "sk-SK",
    storeName: "Herbatica Slovensko",
    storefrontDomain: "herbatica.sk",
  },
  cz: {
    locale: "cs-CZ",
    storeName: "Herbatica Česko",
    storefrontDomain: "herbatica.cz",
  },
  hu: {
    locale: "hu-HU",
    storeName: "Herbatica Magyarország",
    storefrontDomain: "herbatica.hu",
  },
  ro: {
    locale: "ro-RO",
    storeName: "Herbatica România",
    storefrontDomain: "herbatica.ro",
  },
} as const

const buildRegion = (marketCode: MarketCode): RegionFixture => ({
  countries: [{ iso_2: marketCode }],
  id: `region_${marketCode}`,
})

const buildSalesChannel = (
  marketCodes: MarketCode[],
  id = "sales_channel_herbatica"
): SalesChannelFixture => ({
  id,
  metadata: {
    storefront_notification_markets: Object.fromEntries(
      marketCodes.map((marketCode) => {
        const fixture = MARKET_FIXTURES[marketCode]

        return [
          marketCode,
          {
            country_code: marketCode,
            locale: fixture.locale,
            market_code: marketCode,
            store_name: fixture.storeName,
            storefront_domain: fixture.storefrontDomain,
          },
        ]
      })
    ),
  },
})

const buildQuery = ({
  regions,
  salesChannels,
}: {
  regions: RegionFixture[]
  salesChannels: SalesChannelFixture[]
}) => {
  const graph = vi.fn(
    async (input: {
      entity: string
      pagination?: { skip?: number; take?: number }
    }) => {
      const records = input.entity === "region" ? regions : salesChannels
      const skip = input.pagination?.skip ?? 0
      const take = input.pagination?.take ?? records.length

      return { data: records.slice(skip, skip + take) }
    }
  )
  const query = { graph } as unknown as Query

  return {
    container: {
      resolve: vi.fn(() => query),
    } as unknown as MedusaContainer,
  }
}

describe("resolveNotificationMarketContext", () => {
  it.each(
    Object.entries(MARKET_FIXTURES) as [
      MarketCode,
      (typeof MARKET_FIXTURES)[MarketCode],
    ][]
  )("resolves the configured %s market from its Sales Channel", async (marketCode, fixture) => {
    const salesChannel = buildSalesChannel([marketCode])
    const { container } = buildQuery({
      regions: [buildRegion(marketCode)],
      salesChannels: [salesChannel],
    })

    await expect(
      resolveNotificationMarketContext(container, {
        salesChannelId: salesChannel.id,
      })
    ).resolves.toEqual({
      country_code: marketCode,
      locale: fixture.locale,
      market_code: marketCode,
      sales_channel_id: salesChannel.id,
      store_name: fixture.storeName,
      storefront_base_url: `https://${fixture.storefrontDomain}`,
      storefront_domain: fixture.storefrontDomain,
    })
  })

  it("uses a unique country mapping when no Sales Channel is supplied", async () => {
    const salesChannel = buildSalesChannel(["cz"])
    const { container } = buildQuery({
      regions: [buildRegion("cz")],
      salesChannels: [salesChannel],
    })

    await expect(
      resolveNotificationMarketContext(container, { countryCode: " CZ " })
    ).resolves.toEqual({
      country_code: "cz",
      locale: "cs-CZ",
      market_code: "cz",
      sales_channel_id: salesChannel.id,
      store_name: "Herbatica Česko",
      storefront_base_url: "https://herbatica.cz",
      storefront_domain: "herbatica.cz",
    })
  })

  it("does not fall back to country for an unknown Sales Channel", async () => {
    const { container } = buildQuery({ regions: [], salesChannels: [] })

    await expect(
      resolveNotificationMarketContext(container, {
        countryCode: "sk",
        salesChannelId: "sales_channel_unknown",
      })
    ).rejects.toThrow(
      "Notification market cannot be resolved unambiguously from Sales Channel metadata."
    )
  })

  it("rejects ambiguous country mappings", async () => {
    const { container } = buildQuery({
      regions: [buildRegion("sk")],
      salesChannels: [
        buildSalesChannel(["sk"], "sales_channel_first"),
        buildSalesChannel(["sk"], "sales_channel_second"),
      ],
    })

    await expect(
      resolveNotificationMarketContext(container, { countryCode: "sk" })
    ).rejects.toThrow(
      "Notification market cannot be resolved unambiguously from Sales Channel metadata."
    )
  })

  it("rejects country mismatches and incomplete metadata", async () => {
    const salesChannel = buildSalesChannel(["sk"])
    const mismatchedCountry = buildQuery({
      regions: [buildRegion("sk")],
      salesChannels: [salesChannel],
    }).container
    const incompleteMetadata = buildQuery({
      regions: [buildRegion("sk")],
      salesChannels: [
        {
          id: salesChannel.id,
          metadata: {
            storefront_notification_markets: {
              sk: { country_code: "sk" },
            },
          },
        },
      ],
    }).container

    await expect(
      resolveNotificationMarketContext(mismatchedCountry, {
        countryCode: "cz",
        salesChannelId: salesChannel.id,
      })
    ).rejects.toThrow(
      "Notification market cannot be resolved unambiguously from Sales Channel metadata."
    )
    await expect(
      resolveNotificationMarketContext(incompleteMetadata, {
        salesChannelId: salesChannel.id,
      })
    ).rejects.toThrow("Notification market configuration is incomplete.")
  })

  it("rejects a market without exactly one configured region", async () => {
    const salesChannel = buildSalesChannel(["sk"])
    const { container } = buildQuery({
      regions: [],
      salesChannels: [salesChannel],
    })

    await expect(
      resolveNotificationMarketContext(container, {
        salesChannelId: salesChannel.id,
      })
    ).rejects.toThrow(
      "Notification market must match exactly one configured Medusa region."
    )
  })
})
