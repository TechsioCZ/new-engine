import type { HttpTypes } from "@medusajs/types"
import {
  createMedusaProductService,
  type MedusaProductDetailInput,
  type MedusaProductListInput,
} from "../src/products/medusa-service"

type SdkLike = {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
}

const createProduct = (
  id: string,
  title = "Product",
  handle = id
): HttpTypes.StoreProduct =>
  ({ id, title, handle } as HttpTypes.StoreProduct)

function createSdkMock(
  response?: Partial<HttpTypes.StoreProductListResponse>
): SdkLike {
  return {
    client: {
      fetch: vi.fn().mockResolvedValue({
        products: [],
        count: 0,
        limit: 0,
        offset: 0,
        ...response,
      }),
    },
  }
}

describe("createMedusaProductService", () => {
  it("applies default list fields, lowercases country code, and forwards signal", async () => {
    const sdk = createSdkMock({
      products: [createProduct("prod_1")],
      count: 1,
      limit: 12,
      offset: 0,
    })
    const service = createMedusaProductService(sdk as never, {
      defaultListFields: "id,title,handle",
    })
    const controller = new AbortController()

    await service.getProducts(
      { limit: 12, offset: 0, country_code: "CZ" },
      controller.signal
    )

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products", {
      query: expect.objectContaining({
        limit: 12,
        offset: 0,
        fields: "id,title,handle",
        country_code: "cz",
      }),
      signal: controller.signal,
    })
  })

  it("supports custom list query normalization and list transforms", async () => {
    const sdk = createSdkMock({
      products: [createProduct("prod_1", "Hoodie")],
      count: 1,
      limit: 12,
      offset: 0,
    })
    const service = createMedusaProductService<
      { id: string; label: string },
      MedusaProductListInput & { sort?: "newest" }
    >(sdk as never, {
      normalizeListQuery: ({ sort, ...params }) => ({
        ...params,
        order: sort === "newest" ? "-created_at" : undefined,
      }),
      transformListProduct: (product) => ({
        id: product.id,
        label: product.title,
      }),
    })

    const result = await service.getProducts({
      limit: 12,
      offset: 0,
      sort: "newest",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products", {
      query: expect.objectContaining({
        limit: 12,
        offset: 0,
        order: "-created_at",
      }),
      signal: undefined,
    })
    expect(result.products).toEqual([{ id: "prod_1", label: "Hoodie" }])
  })

  it("applies default detail fields and returns null when handle is not found", async () => {
    const sdk = createSdkMock({
      products: [],
      count: 0,
      limit: 1,
      offset: 0,
    })
    const service = createMedusaProductService(sdk as never, {
      defaultDetailFields: "id,title,handle,description",
    })

    const result = await service.getProductByHandle({
      handle: "missing-product",
      country_code: "CZ",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products", {
      query: expect.objectContaining({
        handle: "missing-product",
        limit: 1,
        fields: "id,title,handle,description",
        country_code: "cz",
      }),
      signal: undefined,
    })
    expect(result).toBeNull()
  })

  it("supports custom detail query normalization and detail transforms", async () => {
    const sdk = createSdkMock({
      products: [createProduct("prod_2", "T-Shirt", "test-product")],
      count: 1,
      limit: 1,
      offset: 0,
    })
    const service = createMedusaProductService<
      { slug: string; label: string },
      MedusaProductListInput,
      MedusaProductDetailInput
    >(sdk as never, {
      normalizeDetailQuery: (params) => ({
        handle: params.handle,
        limit: 1,
        fields: "id,handle,title",
      }),
      transformDetailProduct: (product) => ({
        slug: product.handle,
        label: product.title,
      }),
    })

    const result = await service.getProductByHandle({
      handle: "test-product",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products", {
      query: {
        handle: "test-product",
        limit: 1,
        fields: "id,handle,title",
      },
      signal: undefined,
    })
    expect(result).toEqual({ slug: "test-product", label: "T-Shirt" })
  })
})
