import type {
  filterOutInternalProductCategories as filterOutInternalProductCategoriesType,
  wrapProductsWithTaxPrices as wrapProductsWithTaxPricesType,
} from "@medusajs/medusa/api/store/products/helpers"
import type wrapVariantsWithInventoryQuantityForSalesChannelType from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "../../../../../../src/api/store/products/[id]/route"
import type {
  decorateProductsWithMeasurements as decorateProductsWithMeasurementsType,
  getMeasurementDecorationOptions as getMeasurementDecorationOptionsType,
  getMeasurementDecorationQueryFields as getMeasurementDecorationQueryFieldsType,
} from "../../../../../../src/utils/measurement-units"

const {
  decorateProductsWithMeasurements,
  filterOutInternalProductCategories,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
  wrapProductsWithTaxPrices,
  wrapVariantsWithInventoryQuantityForSalesChannel,
} = vi.hoisted(() => ({
  decorateProductsWithMeasurements: vi
    .fn<typeof decorateProductsWithMeasurementsType>()
    .mockResolvedValue([]),
  filterOutInternalProductCategories:
    vi.fn<typeof filterOutInternalProductCategoriesType>(),
  getMeasurementDecorationOptions: vi.fn<
    typeof getMeasurementDecorationOptionsType
  >(() => ({
    includePricePerUnit: false,
    includeProductMeasurement: false,
    includeVariantMeasurement: false,
  })),
  getMeasurementDecorationQueryFields: vi.fn<
    typeof getMeasurementDecorationQueryFieldsType
  >((fields) => fields),
  wrapProductsWithTaxPrices: vi
    .fn<typeof wrapProductsWithTaxPricesType>()
    .mockResolvedValue(),
  wrapVariantsWithInventoryQuantityForSalesChannel: vi
    .fn<typeof wrapVariantsWithInventoryQuantityForSalesChannelType>()
    .mockResolvedValue(),
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

const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (
  candidate: unknown,
  requiredKeys: readonly string[],
): asserts candidate is unknown => {
  if (candidate === null || typeof candidate !== "object") {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${key}`)
    }
  }
}

const createHarness = (fields: string[]) => {
  const graph = vi.fn<
    (input: { fields: string[] }) => Promise<{ data: object[] }>
  >(
    async ({ fields: queryFields }) =>
      await Promise.resolve({
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
  const json = vi.fn<(body: unknown) => void>()
  const req = {
    filterableFields: {},
    params: { id: "prod_1" },
    queryConfig: { fields },
    scope: {
      resolve: vi.fn<(key: unknown) => { graph: typeof graph }>(() => ({
        graph,
      })),
    },
  }

  const res = { json }
  const requestCandidate: unknown = req
  const responseCandidate: unknown = res
  assertMockShape<Parameters<typeof GET>[0]>(requestCandidate, [
    "filterableFields",
    "params",
    "queryConfig",
    "scope",
  ])
  assertMockShape<Parameters<typeof GET>[1]>(responseCandidate, ["json"])

  return {
    graph,
    json,
    req: requestCandidate,
    res: responseCandidate,
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

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ["id", "title", "variants.id"],
      }),
      {},
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

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ["id", "*categories", "categories.is_internal"],
      }),
      {},
    )
    expect(filterOutInternalProductCategories).toHaveBeenCalledOnce()
  })
})
