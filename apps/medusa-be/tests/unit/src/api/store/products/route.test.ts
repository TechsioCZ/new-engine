import type { wrapProductsWithTaxPrices as wrapProductsWithTaxPricesType } from "@medusajs/medusa/api/store/products/helpers"
import type { wrapVariantsWithInventoryQuantityForSalesChannel as wrapVariantsWithInventoryQuantityForSalesChannelType } from "@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "../../../../../../src/api/store/products/[id]/route"
import type {
  decorateProductsWithMeasurements as decorateProductsWithMeasurementsType,
  getMeasurementDecorationOptions as getMeasurementDecorationOptionsType,
  getMeasurementDecorationQueryFields as getMeasurementDecorationQueryFieldsType,
} from "../../../../../../src/utils/measurement-units"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

const {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  getMeasurementDecorationQueryFields,
  wrapProductsWithTaxPrices,
  wrapVariantsWithInventoryQuantityForSalesChannel,
} = vi.hoisted(() => ({
  decorateProductsWithMeasurements: vi
    .fn<typeof decorateProductsWithMeasurementsType>()
    .mockResolvedValue([]),
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
    .mockImplementation(async () => {}),
  wrapVariantsWithInventoryQuantityForSalesChannel: vi
    .fn<typeof wrapVariantsWithInventoryQuantityForSalesChannelType>()
    .mockImplementation(async () => {}),
}))

vi.mock(
  import("@medusajs/medusa/api/store/products/helpers"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      wrapProductsWithTaxPrices,
    }),
)

vi.mock(
  import("@medusajs/medusa/api/utils/middlewares/products/variant-inventory-quantity"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      wrapVariantsWithInventoryQuantityForSalesChannel,
    }),
)

vi.mock(
  import("../../../../../../src/utils/measurement-units"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      decorateProductsWithMeasurements,
      getMeasurementDecorationOptions,
      getMeasurementDecorationQueryFields,
    }),
)

const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
): asserts candidate is T => {
  if (candidate === null || typeof candidate !== "object") {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const createHarness = (fields: string[]) => {
  const product = {
    created_at: null,
    deleted_at: null,
    description: null,
    discountable: true,
    external_id: null,
    handle: "product-1",
    height: null,
    hs_code: null,
    id: "prod_1",
    images: null,
    is_giftcard: false,
    length: null,
    material: null,
    mid_code: null,
    options: null,
    origin_country: null,
    status: "published",
    subtitle: null,
    thumbnail: null,
    title: "Product 1",
    type_id: null,
    updated_at: null,
    variants: [],
    weight: null,
    width: null,
    ...(fields.some((field) => field.includes("categories"))
      ? {
          categories: [
            { id: "pcat_public", is_internal: false },
            { id: "pcat_internal", is_internal: true },
          ],
        }
      : {}),
  }
  const graph = vi.fn<
    (input: { fields: string[] }) => Promise<{ data: object[] }>
  >(async () => await Promise.resolve({ data: [product] }))
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
    product,
    req: requestCandidate,
    res: responseCandidate,
  }
}

describe("store product detail field projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not query or return category internals when categories were not requested", async () => {
    const { graph, json, product, req, res } = createHarness([
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
    expect(json).toHaveBeenCalledWith({ product })
  })

  it("adds the visibility helper and filters when categories are requested", async () => {
    const { graph, json, product, req, res } = createHarness([
      "id",
      "*categories",
    ])

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: ["id", "*categories", "categories.is_internal"],
      }),
      {},
    )
    expect(json).toHaveBeenCalledWith({
      product: {
        ...product,
        categories: [{ id: "pcat_public", is_internal: false }],
      },
    })
  })
})
