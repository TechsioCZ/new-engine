import type { HttpTypes } from "@medusajs/types"
import { vi, describe, expect, it } from "vitest"

import { createMedusaProductService } from "../src/products/medusa-service"
import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "../src/products/medusa-service"

interface SdkLike {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
}

const createProduct = (
  id: string,
  title = "Product",
  handle = id
): HttpTypes.StoreProduct => ({ handle, id, title }) as HttpTypes.StoreProduct

function createSdkMock(
  response?: Partial<HttpTypes.StoreProductListResponse>
): SdkLike {
  return {
    client: {
      fetch: vi.fn().mockResolvedValue({
        count: 0,
        limit: 0,
        offset: 0,
        products: [],
        ...response,
      }),
    },
  }
}

describe(createMedusaProductService, () => {
  it("applies default list fields, lowercases country code, and forwards signal", async () => {
    const sdk = createSdkMock({
      count: 1,
      limit: 12,
      offset: 0,
      products: [createProduct("prod_1")],
    })
    const service = createMedusaProductService(sdk as never, {
      defaultListFields: "id,title,handle",
    })
    const controller = new AbortController()

    await service.getProducts(
      { country_code: "CZ", limit: 12, offset: 0 },
      controller.signal
    )

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products", {
      query: expect.objectContaining({
        country_code: "cz",
        fields: "id,title,handle",
        limit: 12,
        offset: 0,
      }),
      signal: controller.signal,
    })
  })

  it("supports custom list query normalization and list transforms", async () => {
    const sdk = createSdkMock({
      count: 1,
      limit: 12,
      offset: 0,
      products: [createProduct("prod_1", "Hoodie")],
    })
    const service = createMedusaProductService<
      { id: string; label: string },
      MedusaProductListInput & { sort?: "newest" }
    >(sdk as never, {
      normalizeListQuery: ({ sort, ...params }) => ({
        ...params,
        ...(sort === "newest" ? { order: "-created_at" } : {}),
      }),
      transformDetailProduct: (product) => ({
        id: product.id,
        label: product.title,
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
      signal: null,
    })
    expect(result.products).toStrictEqual([{ id: "prod_1", label: "Hoodie" }])
  })

  it("applies default detail fields and returns null when handle is not found", async () => {
    const sdk = createSdkMock({
      count: 0,
      limit: 1,
      offset: 0,
      products: [],
    })
    const service = createMedusaProductService(sdk as never, {
      defaultDetailFields: "id,title,handle,description",
    })

    const result = await service.getProductByHandle({
      country_code: "CZ",
      handle: "missing-product",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products", {
      query: expect.objectContaining({
        country_code: "cz",
        fields: "id,title,handle,description",
        handle: "missing-product",
        limit: 1,
      }),
      signal: null,
    })
    expect(result).toBeNull()
  })

  it("supports custom detail query normalization and detail transforms", async () => {
    const sdk = createSdkMock({
      count: 1,
      limit: 1,
      offset: 0,
      products: [createProduct("prod_2", "T-Shirt", "test-product")],
    })
    const service = createMedusaProductService<
      { slug: string; label: string },
      MedusaProductListInput
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
      transformListProduct: (product) => ({
        slug: product.handle,
        label: product.title,
      }),
    })

    const result = await service.getProductByHandle({
      handle: "test-product",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products", {
      query: {
        fields: "id,handle,title",
        handle: "test-product",
        limit: 1,
      },
      signal: null,
    })
    expect(result).toStrictEqual({ label: "T-Shirt", slug: "test-product" })
  })
})
