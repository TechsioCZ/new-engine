import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  decorateProductsWithMeasurements,
  filterOutInternalProductCategories,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
  wrapProductsWithTaxPrices,
  wrapVariantsWithInventoryQuantityForSalesChannel,
} = vi.hoisted(() => ({
  decorateProductsWithMeasurements: vi.fn().mockResolvedValue(undefined),
  filterOutInternalProductCategories: vi.fn(),
  getMeasurementDecorationOptions: vi.fn(() => ({
    includePricePerUnit: false,
    includeProductMeasurement: false,
    includeVariantMeasurement: false,
  })),
  getMeasurementDecorationQueryFields: vi.fn((fields: string[]) => fields),
  wrapProductsWithTaxPrices: vi.fn().mockResolvedValue(undefined),
  wrapVariantsWithInventoryQuantityForSalesChannel: vi
    .fn()
    .mockResolvedValue(undefined),
}))

vi.mock("@medusajs/medusa/api/store/products/helpers", () => ({
  filterOutInternalProductCategories,
  wrapProductsWithTaxPrices,
}))

vi.mock(
  "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity",
  () => ({
    default: wrapVariantsWithInventoryQuantityForSalesChannel,
  })
)

vi.mock("../../../../../../src/utils/measurement-units", () => ({
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
}))

import { GET } from "../../../../../../src/api/store/products/[id]/route"
import { enforceExactStorefrontProductDetailMarketSalesChannel } from "../../../../../../src/api/store/storefront-market-sales-channel"

const createHarness = (fields: string[]) => {
  const graph = vi.fn(
    async ({ fields: queryFields }: { fields: string[] }) => ({
      data: [
        {
          id: "prod_1",
          ...(queryFields.includes("categories.is_internal")
            ? {
                categories: [
                  { id: "pcat_public", is_internal: false },
                  { id: "pcat_internal", is_internal: true },
                ],
              }
            : {}),
          variants: [],
        },
      ],
    })
  )
  const json = vi.fn()
  const req = {
    filterableFields: {},
    locale: undefined,
    params: { id: "prod_1" },
    pricingContext: undefined,
    queryConfig: { fields },
    scope: {
      resolve: vi.fn(() => ({ graph })),
    },
  }

  return {
    graph,
    json,
    req,
    res: { json },
  }
}

describe("store product detail field projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not query or return category internals when categories were not requested", async () => {
    const { graph, json, req, res } = createHarness([
      "id",
      "title",
      "variants.id",
    ])

    await GET(req as never, res as never)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ["id", "title", "variants.id"],
      }),
      { locale: undefined }
    )
    expect(filterOutInternalProductCategories).not.toHaveBeenCalled()
    expect(json).toHaveBeenCalledWith({
      product: {
        id: "prod_1",
        variants: [],
      },
    })
  })

  it("adds the visibility helper and filters when categories are requested", async () => {
    const { graph, req, res } = createHarness(["id", "*categories"])

    await GET(req as never, res as never)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ["id", "*categories", "categories.is_internal"],
      }),
      { locale: undefined }
    )
    expect(filterOutInternalProductCategories).toHaveBeenCalledOnce()
  })
})

describe("store product detail market isolation", () => {
  const channel = {
    id: "sc_sk",
    metadata: {
      storefront_notification_markets: {
        sk: {
          country_code: "sk",
          locale: "sk-SK",
          market_code: "sk",
          store_name: "Herbatica",
          storefront_domain: "herbatica.sk",
        },
      },
    },
  }

  const createScopedHarness = (productLinks = [{ product_id: "prod_1" }]) => {
    const graph = vi.fn(async (config: Record<string, unknown>) => {
      if (config.entity === "sales_channel") {
        return { data: [channel] }
      }
      if (config.entity === "product_sales_channel") {
        return { data: productLinks }
      }
      if (config.entity === "product") {
        const filters = config.filters as Record<string, unknown>
        if ("sales_channel_id" in filters) {
          throw new Error(
            "Medusa product graph does not support raw sales_channel_id filters"
          )
        }
        return {
          data: [{ id: "prod_1", title: "Product", variants: [] }],
        }
      }
      throw new Error(`Unexpected graph entity ${String(config.entity)}`)
    })
    const json = vi.fn()
    const next = vi.fn()
    const req = {
      filterableFields: {
        sales_channel_id: ["sc_sk", "sc_ro"],
        status: "published",
      },
      locale: "sk-SK",
      params: { id: "prod_1" },
      pricingContext: undefined,
      publishable_key_context: { sales_channel_ids: ["sc_sk"] },
      queryConfig: { fields: ["id", "title", "variants.id"] },
      scope: {
        resolve: vi.fn(() => ({ graph })),
      },
    }

    return { graph, json, next, req, res: { json } }
  }

  it("proves exact channel membership before calling the installed detail graph without its unsupported filter", async () => {
    const { graph, json, next, req, res } = createScopedHarness()

    await enforceExactStorefrontProductDetailMarketSalesChannel(
      req as never,
      res as never,
      next
    )
    expect(next).toHaveBeenCalledOnce()

    await GET(req as never, res as never)

    expect(graph).toHaveBeenCalledWith({
      entity: "product_sales_channel",
      fields: ["product_id"],
      filters: {
        product_id: "prod_1",
        sales_channel_id: ["sc_sk"],
      },
      pagination: { take: 2 },
    })
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "product",
        filters: {
          id: "prod_1",
          status: "published",
        },
      }),
      { locale: "sk-SK" }
    )
    expect(json).toHaveBeenCalledWith({
      product: { id: "prod_1", title: "Product", variants: [] },
    })
  })

  it("fails closed before the product graph when channel membership is absent", async () => {
    const { graph, next, req, res } = createScopedHarness([])

    await expect(
      enforceExactStorefrontProductDetailMarketSalesChannel(
        req as never,
        res as never,
        next
      )
    ).rejects.toThrow("Product was not found in this storefront")

    expect(next).not.toHaveBeenCalled()
    expect(
      graph.mock.calls.some(([config]) => config.entity === "product")
    ).toBe(false)
  })
})
