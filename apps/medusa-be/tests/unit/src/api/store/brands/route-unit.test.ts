import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getRecordValue, isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { GET } from "../../../../../../src/api/store/brands/[id]/products/route"
import { storeBrandsRoutesMiddlewares } from "../../../../../../src/api/store/brands/middlewares"
import {
  StoreBrandsDetailProductsSchema,
  StoreBrandsDetailSchema,
  StoreBrandsSchema,
} from "../../../../../../src/api/store/brands/validators"

type Graph = (input: unknown) => Promise<{
  data: unknown[]
  metadata?: { count: number; skip: number; take: number }
}>
type Json = (body: unknown) => unknown
interface RemoteQuery {
  (input: unknown): Promise<unknown>
  graph: Graph
}
type MockedGetResponse = Parameters<typeof GET>[1] & { json: Mock<Json> }

vi.mock(import("../../../../../../src/links/product-brand"), async () => {
  const medusaUtils = await import("@medusajs/utils")
  return {
    ProductBrandLink: {
      [medusaUtils.DefineLinkSymbol]: true,
      entryPoint: "product_brand",
      serviceName: "ProductBrandLink",
    },
  }
})

const isMockedGetResponse = (
  candidate: unknown,
): candidate is MockedGetResponse =>
  isRecord(candidate) && typeof getRecordValue(candidate, "json") === "function"

const createMockResponse = (): MockedGetResponse => {
  const candidate: unknown = { json: vi.fn<Json>().mockReturnThis() }
  if (!isMockedGetResponse(candidate)) {
    throw new TypeError("Expected a response with a json function")
  }
  return candidate
}

const createRemoteQuery = (graph: Graph): RemoteQuery =>
  Object.assign(vi.fn<(input: unknown) => Promise<unknown>>(), { graph })

const isMockRequest = (
  candidate: unknown,
): candidate is Parameters<typeof GET>[0] => {
  if (!isRecord(candidate)) {
    return false
  }
  const filterableFields = getRecordValue(candidate, "filterableFields")
  const params = getRecordValue(candidate, "params")
  const queryConfig = getRecordValue(candidate, "queryConfig")
  const scope = getRecordValue(candidate, "scope")
  if (
    !isRecord(filterableFields) ||
    !isRecord(params) ||
    !isRecord(queryConfig) ||
    !isRecord(scope)
  ) {
    return false
  }
  return typeof getRecordValue(scope, "resolve") === "function"
}

const createRequest = ({
  brandId,
  graph,
  remoteQuery,
  skip = 0,
}: {
  brandId: string
  graph: Graph
  remoteQuery: RemoteQuery
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
      resolve: vi.fn<(key: string) => unknown>((key) =>
        key === ContainerRegistrationKeys.QUERY ? { graph } : remoteQuery,
      ),
    },
  }
  if (!isMockRequest(candidate)) {
    throw new TypeError("Expected a Store Brand products request")
  }
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
    expect(schema.safeParse({ with_deleted: "true" }).success).toBeFalsy()
    expect(schema.safeParse({ with_deleted: "false" }).success).toBeFalsy()
  })

  it("retains supported Store product pagination and sales-channel inputs", () => {
    expect(
      StoreBrandsDetailProductsSchema.parse({
        fields: "id,title",
        limit: "12",
        offset: "4",
        sales_channel_id: ["sc_1", "sc_2"],
      }),
    ).toStrictEqual({
      fields: "id,title",
      limit: 12,
      offset: 4,
      sales_channel_id: ["sc_1", "sc_2"],
    })
  })

  it("keeps the standard Store product visibility middleware chain", () => {
    const productsRoute = storeBrandsRoutesMiddlewares.find(
      (route) => route.matcher === "/store/brands/:id/products",
    )

    expect(productsRoute?.middlewares).toHaveLength(4)
  })

  it("does not query links or products when the active Brand is absent", async () => {
    const graph = vi.fn<Graph>().mockResolvedValueOnce({ data: [] })
    const remoteQuery = createRemoteQuery(graph)
    const req = createRequest({ brandId: "brand_deleted", graph, remoteQuery })
    const response = createMockResponse()

    await expect(GET(req, response)).rejects.toThrow(
      'Brand with id "brand_deleted" was not found',
    )
    expect(graph).toHaveBeenCalledOnce()
    expect(response.json).not.toHaveBeenCalled()
  })

  it("returns an empty page without widening an unlinked Brand to all products", async () => {
    const graph = vi
      .fn<Graph>()
      .mockResolvedValueOnce({ data: [{ id: "brand_1" }] })
      .mockResolvedValueOnce({ data: [] })
    const remoteQuery = createRemoteQuery(graph)
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
      count: 0,
      limit: 20,
      offset: 20,
      products: [],
    })
  })

  it("intersects linked products with published and authorized-channel filters", async () => {
    const graph = vi
      .fn<Graph>()
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
    const remoteQuery = createRemoteQuery(graph)
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
      count: 1,
      limit: 20,
      offset: 0,
      products: [{ id: "prod_visible", title: "Visible" }],
    })
  })
})
