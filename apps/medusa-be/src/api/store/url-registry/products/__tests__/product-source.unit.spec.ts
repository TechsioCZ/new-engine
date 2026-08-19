import type { MedusaStoreRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import {
  readPublishedProductCatalogSource,
  readPublishedProductCatalogSources,
} from "../../product-source"

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "prod_1",
  metadata: {
    url_registry_publication: {
      markets: {
        sk: {
          publicationStatus: "published",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
        },
      },
      schemaVersion: 1,
    },
  },
  sales_channels: [{ id: "sc_sk" }],
  updated_at: "2026-08-19T00:00:00.000Z",
  ...overrides,
})

const request = ({
  products = [product()],
  salesChannelIds = ["sc_sk"],
  translations = [
    {
      deleted_at: null,
      id: "trans_1",
      locale_code: "sk-SK",
      reference: "product",
      reference_id: "prod_1",
      translations: { title: "Vitamín C" },
    },
  ],
}: {
  products?: unknown[]
  salesChannelIds?: string[]
  translations?: unknown[]
} = {}) =>
  ({
    publishable_key_context: { sales_channel_ids: salesChannelIds },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === Modules.PRODUCT) {
          return { listProducts: vi.fn(async () => products) }
        }
        if (key === Modules.TRANSLATION) {
          return { listTranslations: vi.fn(async () => translations) }
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }) as unknown as MedusaStoreRequest

describe("published product catalog source", () => {
  it("proves assignment, channel, source version, and exact translation", async () => {
    await expect(
      readPublishedProductCatalogSource(request(), "prod_1", "sk")
    ).resolves.toEqual({
      kind: "found",
      source: {
        entityId: "prod_1",
        marketCode: "sk",
        publicSlug: "vitamin-c",
        salesChannelId: "sc_sk",
        sourceVersion: "2026-08-19T00:00:00.000Z",
        translation: {
          localeCode: "sk-SK",
          reference: "product",
          translationId: "trans_1",
        },
      },
    })
  })

  it.each([
    ["missing product", { products: [] }],
    ["missing exact translation", { translations: [] }],
    ["wrong key channel", { salesChannelIds: ["sc_cz"] }],
  ])("returns missing for %s", async (_label, options) => {
    await expect(
      readPublishedProductCatalogSource(request(options), "prod_1", "sk")
    ).resolves.toEqual({ kind: "missing" })
  })

  it("returns unavailable for ambiguous or corrupt source state", async () => {
    await expect(
      readPublishedProductCatalogSource(
        request({ products: [product(), product()] }),
        "prod_1",
        "sk"
      )
    ).resolves.toEqual({ kind: "unavailable" })
    await expect(
      readPublishedProductCatalogSource(
        request({ products: [product({ metadata: [] })] }),
        "prod_1",
        "sk"
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })

  it("validates an ordered product batch with one product and one translation read", async () => {
    const products = [
      product(),
      product({
        id: "prod_2",
        metadata: {
          url_registry_publication: {
            markets: {
              sk: {
                publicationStatus: "published",
                publicSlug: "zinok",
                salesChannelId: "sc_sk",
              },
            },
            schemaVersion: 1,
          },
        },
      }),
    ]
    const translations = [
      {
        deleted_at: null,
        id: "trans_1",
        locale_code: "sk-SK",
        reference: "product",
        reference_id: "prod_1",
        translations: { title: "Vitamín C" },
      },
      {
        deleted_at: null,
        id: "trans_2",
        locale_code: "sk-SK",
        reference: "product",
        reference_id: "prod_2",
        translations: { title: "Zinok" },
      },
    ]
    const listProducts = vi.fn(async () => products)
    const listTranslations = vi.fn(async () => translations)
    const batchRequest = {
      publishable_key_context: { sales_channel_ids: ["sc_sk"] },
      scope: {
        resolve: vi.fn((key: string) => {
          if (key === Modules.PRODUCT) {
            return { listProducts }
          }
          if (key === Modules.TRANSLATION) {
            return { listTranslations }
          }
          throw new Error(`Unexpected dependency: ${key}`)
        }),
      },
    } as unknown as MedusaStoreRequest

    const result = await readPublishedProductCatalogSources(
      batchRequest,
      [
        { entityId: "prod_1", publicSlug: "vitamin-c" },
        { entityId: "prod_2", publicSlug: "zinok" },
      ],
      "sk"
    )

    expect(result.kind).toBe("found")
    if (result.kind === "found") {
      expect(result.sources.map((source) => source.entityId)).toEqual([
        "prod_1",
        "prod_2",
      ])
    }
    expect(listProducts).toHaveBeenCalledTimes(1)
    expect(listTranslations).toHaveBeenCalledTimes(1)
  })

  it("fails a batch closed for a stale public slug", async () => {
    await expect(
      readPublishedProductCatalogSources(
        request(),
        [{ entityId: "prod_1", publicSlug: "stale-slug" }],
        "sk"
      )
    ).resolves.toEqual({ kind: "missing" })
  })

  it("rejects more than 100 candidates before reading Medusa", async () => {
    const oversizedRequest = request()
    await expect(
      readPublishedProductCatalogSources(
        oversizedRequest,
        Array.from({ length: 101 }, (_, index) => ({
          entityId: `prod_${index}`,
          publicSlug: `product-${index}`,
        })),
        "sk"
      )
    ).resolves.toEqual({ kind: "unavailable" })
    expect(oversizedRequest.scope.resolve).not.toHaveBeenCalled()
  })
})
