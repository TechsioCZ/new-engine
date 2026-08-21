import {
  canonicalJsonLine,
  sha256Bytes,
} from "../../../../../src/scripts/market-price-authority/canonical"
import type {
  MarketPriceAuthority,
  MarketPriceDatabaseSnapshot,
  MarketPriceMarketCode,
} from "../../../../../src/scripts/market-price-authority/types"

export const AUTHORITY_SHA = "a".repeat(64)

export const rawSourceBytes = {
  cz: "official CZ prices\n",
  hu: "official HU prices\n",
  ro: "official RO prices\n",
  sk: "official SK prices\n",
} as const satisfies Record<MarketPriceMarketCode, string>

export const authority = (): MarketPriceAuthority => ({
  amountUnit: "major",
  kind: "reviewed-market-price-authority",
  markets: [
    market("cz", "czk", "sc_cz", 129.9),
    market("hu", "huf", "sc_hu", 1990),
    market("ro", "ron", "sc_ro", null),
    market("sk", "eur", "sc_sk", 12.9),
  ],
  priceDerivation: "direct-reviewed-source",
  schemaVersion: 1,
})

const market = (
  marketCode: MarketPriceMarketCode,
  currencyCode: "czk" | "eur" | "huf" | "ron",
  salesChannelId: string,
  amount: null | number
) => ({
  commercialApproval: {
    approvedAt: "2026-08-20T12:00:00.000Z",
    approvedBy: `commercial-${marketCode}`,
    reference: `approval-${marketCode}`,
  },
  currencyCode,
  editor: {
    editedAt: "2026-08-20T11:00:00.000Z",
    editorId: `editor-${marketCode}`,
    reference: `edit-${marketCode}`,
  },
  marketCode,
  prices: [
    {
      amount,
      availability:
        amount === null ? ("unavailable" as const) : ("sellable" as const),
      productId: "prod_1",
      sourceRecordKey: `${marketCode}-record-1`,
      variantId: "variant_1",
    },
  ],
  rawSource: {
    provenance: {
      locator: `https://prices.example/${marketCode}`,
      retrievedAt: "2026-08-20T10:00:00.000Z",
      sourceType: "commercial-export",
    },
    sha256: sha256Bytes(rawSourceBytes[marketCode]),
  },
  salesChannelId,
})

export const authorityBytes = () => canonicalJsonLine(authority())

export const snapshot = (): MarketPriceDatabaseSnapshot => ({
  products: [
    {
      id: "prod_1",
      salesChannelIds: ["sc_cz", "sc_hu", "sc_ro", "sc_sk"],
      status: "published",
      variants: [
        {
          id: "variant_1",
          priceSetId: "pset_1",
          prices: [
            price("price_cz", "czk", 120),
            price("price_hu", "huf", 1990),
            price("price_sk", "eur", 12.9),
          ],
        },
      ],
    },
  ],
})

export const price = (id: string, currencyCode: string, amount: number) => ({
  amount,
  currencyCode,
  id,
  maxQuantity: null,
  minQuantity: null,
  priceListId: null,
  rules: [],
})
