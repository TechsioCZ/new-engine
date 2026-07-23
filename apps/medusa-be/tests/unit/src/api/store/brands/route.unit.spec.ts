import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "../../../../../../src/api/store/brands/[id]/products/route"
import { storeBrandsRoutesMiddlewares } from "../../../../../../src/api/store/brands/middlewares"
import {
  StoreBrandsDetailProductsSchema,
  StoreBrandsDetailSchema,
  StoreBrandsSchema,
} from "../../../../../../src/api/store/brands/validators"

vi.mock("../../../../../../src/links/product-brand", () => ({
  ProductBrandLink: {
    entryPoint: "product_brand",
  },
}))

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock this way avoids requiring every
 * property of the huge Node request/response interfaces while still
 * validating the shape the route handler actually reads from at runtime.
 */
function assertMockShape<T>(
  candidate: unknown,
  requiredKeys: readonly string[]
): asserts candidate is T {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${key}`)
    }
  }
}

type MockedGetResponse = Parameters<typeof GET>[1] & {
  json: ReturnType<typeof vi.fn>
}

const createMockResponse = (): MockedGetResponse => {
  const candidate: unknown = {
    json: vi.fn().mockReturnThis(),
  }

  assertMockShape<MockedGetResponse>(candidate, ["json"])
  return candidate
}

const createRequest = ({
  brandId,
  graph,
  remoteQuery,
  skip = 0,
}: {
  brandId: string
  graph: ReturnType<typeof vi.fn>
  remoteQuery: ReturnType<typeof vi.fn>
  skip?: number
}): Parameters<typeof GET>[0] => {
  const candidate: unknown = {
    filterableFields: {
      sales_channel_id: ["sc_1"],
      status: "published",
    },
    params: { id: brandId },
    queryConfig: {
      fields: ["id", "title"],
      pagination: { skip, take: 20 },
    },
    scope: {
      resolve: vi.fn((key: string) =>
        key === ContainerRegistrationKeys.QUERY ? { graph } : remoteQuery
      ),
    },
  }

  assertMockShape<Parameters<typeof GET>[0]>(candidate, [
    "filterableFields",
    "params",
    "queryConfig",
    "scope",
  ])
  return candidate
}

describe("Store Brand visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["list", StoreBrandsSchema],
    ["detail", StoreBrandsDetailSchema],
    ["products", StoreBrandsDetailProductsSchema],
  ])("rejects with_deleted on the %s query schema", (_name, schema) => {
    expect(schema.safeParse({ with_deleted: "true" }).success).toBe(false)
    expect(schema.safeParse({ with_deleted: "false" }).success).toBe(false)
  })

  it("retains supported Store product pagination and sales-channel inputs", () => {
    expect(
      StoreBrandsDetailProductsSchema.parse({
        fields: "id,title",
        limit: "12",
        offset: "4",
        sales_channel_id: ["sc_1", "sc_2"],
      })
    ).toEqual({
      fields: "id,title",
      limit: 12,
      offset: 4,
      sales_channel_id: ["sc_1", "sc_2"],
    })
  })

  it("keeps the standard Store product visibility middleware chain", () => {
    const productsRoute = storeBrandsRoutesMiddlewares.find(
      (route) => route.matcher === "/store/brands/:id/products"
    )

    expect(productsRoute?.middlewares).toHaveLength(4)
  })

  it("does not query links or products when the active Brand is absent", async () => {
    const graph = vi.fn().mockResolvedValueOnce({ data: [] })
    const remoteQuery = vi.fn()
    const req = createRequest({ brandId: "brand_deleted", graph, remoteQuery })
    const response = createMockResponse()

    await expect(GET(req, response)).rejects.toThrow(
      'Brand with id "brand_deleted" was not found'
    )
    expect(graph).toHaveBeenCalledTimes(1)
    expect(response.json).not.toHaveBeenCalled()
  })

  it("returns an empty page without widening an unlinked Brand to all products", async () => {
    const graph = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: "brand_1" }] })
      .mockResolvedValueOnce({ data: [] })
    const remoteQuery = vi.fn()
    const req = createRequest({
      brandId: "brand_1",
      graph,
      remoteQuery,
      skip: 20,
    })
    const response = createMockResponse()

    await GET(req, response)

    expect(graph).toHaveBeenCalledTimes(2)
    expect(remoteQuery).not.toHaveBeenCalled()
    expect(response.json).toHaveBeenCalledWith({
      products: [],
      count: 0,
      offset: 20,
      limit: 20,
    })
  })

  it("intersects linked products with published and authorized-channel filters", async () => {
    const graph = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: "brand_1" }] })
      .mockResolvedValueOnce({
        data: [
          { product_id: "prod_visible" },
          { product_id: "prod_wrong_channel" },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ product_id: "prod_visible" }],
      })
      .mockResolvedValueOnce({
        data: [{ id: "prod_visible", title: "Visible" }],
        metadata: { count: 1, skip: 0, take: 20 },
      })
    const remoteQuery = vi.fn()
    const req = createRequest({ brandId: "brand_1", graph, remoteQuery })
    const response = createMockResponse()

    await GET(req, response)

    expect(graph).toHaveBeenNthCalledWith(3, {
      entity: "product_sales_channel",
      fields: ["product_id"],
      filters: {
        product_id: ["prod_visible", "prod_wrong_channel"],
        sales_channel_id: ["sc_1"],
      },
    })
    expect(graph).toHaveBeenNthCalledWith(4, {
      entity: "product",
      fields: ["id", "title"],
      filters: {
        id: ["prod_visible"],
        status: "published",
      },
      pagination: { skip: 0, take: 20 },
    })
    expect(response.json).toHaveBeenCalledWith({
      products: [{ id: "prod_visible", title: "Visible" }],
      count: 1,
      offset: 0,
      limit: 20,
    })
  })
})
