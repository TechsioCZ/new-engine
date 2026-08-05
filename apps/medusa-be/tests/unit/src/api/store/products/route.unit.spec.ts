import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  decorateProductsWithMeasurements,
  filterOutInternalProductCategories,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
  wrapProductsWithTaxPrices,
  wrapVariantsWithInventoryQuantityForSalesChannel,
} = vi.hoisted(() => ({
  decorateProductsWithMeasurements: vi.fn().mockResolvedValue(),
  filterOutInternalProductCategories: vi.fn(),
  getMeasurementDecorationOptions: vi.fn(() => ({
    includePricePerUnit: false,
    includeProductMeasurement: false,
    includeVariantMeasurement: false,
  })),
  getMeasurementDecorationQueryFields: vi.fn((fields: string[]) => fields),
  wrapProductsWithTaxPrices: vi.fn().mockResolvedValue(),
  wrapVariantsWithInventoryQuantityForSalesChannel: vi.fn().mockResolvedValue(),
}))

vi.mock(import("@medusajs/medusa/api/store/products/helpers"), () => ({
  filterOutInternalProductCategories,
  wrapProductsWithTaxPrices,
}))

vi.mock(
  import("@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"),
  () => ({
    default: wrapVariantsWithInventoryQuantityForSalesChannel,
  }),
)

vi.mock(import("../../../../../../src/utils/measurement-units"), () => ({
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
}))

import { GET } from "../../../../../../src/api/store/products/[id]/route"

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
    }),
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
      { locale: undefined },
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
      { locale: undefined },
    )
    expect(filterOutInternalProductCategories).toHaveBeenCalledOnce()
  })
})
