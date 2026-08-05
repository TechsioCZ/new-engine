import type { HttpTypes } from "@medusajs/types"
import { vi, describe, expect, it } from "vitest"

import { createMedusaCategoryService } from "../src/categories/medusa-service"
import type {
  MedusaCategoryDetailInput,
  MedusaCategoryListInput,
} from "../src/categories/medusa-service"

interface SdkLike {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
}

const createCategory = (
  id: string,
  name = "Category",
  handle = id,
): HttpTypes.StoreProductCategory =>
  ({ handle, id, name }) as HttpTypes.StoreProductCategory

function createSdkMock(
  response?: Partial<HttpTypes.StoreProductCategoryListResponse>,
): SdkLike {
  return {
    client: {
      fetch: vi.fn().mockResolvedValue({
        count: 0,
        limit: 0,
        offset: 0,
        product_categories: [],
        ...response,
      }),
    },
  }
}

describe(createMedusaCategoryService, () => {
  it("applies default list fields and forwards signal", async () => {
    const sdk = createSdkMock({
      count: 1,
      product_categories: [createCategory("pcat_1", "T-Shirts", "t-shirts")],
    })
    const service = createMedusaCategoryService(sdk as never, {
      defaultListFields: "id,name,handle,parent_category_id",
    })
    const controller = new AbortController()

    await service.getCategories(
      { enabled: true, limit: 12, offset: 0 },
      controller.signal,
    )

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/product-categories", {
      query: {
        fields: "id,name,handle,parent_category_id",
        limit: 12,
        offset: 0,
      },
      signal: controller.signal,
    })
  })

  it("supports custom list query normalization and list transforms", async () => {
    const sdk = createSdkMock({
      count: 1,
      product_categories: [createCategory("pcat_2", "Hoodies", "hoodies")],
    })
    const service = createMedusaCategoryService<
      { id: string; label: string },
      MedusaCategoryListInput & { parent?: string }
    >(sdk as never, {
      normalizeListQuery: ({ parent, ...params }) => ({
        ...params,
        ...(parent ? { parent_category_id: parent } : {}),
      }),
      transformDetailCategory: (category) => ({
        id: category.id,
        label: category.name,
      }),
      transformListCategory: (category) => ({
        id: category.id,
        label: category.name,
      }),
    })

    const result = await service.getCategories({
      limit: 20,
      offset: 0,
      parent: "pcat_root",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/product-categories", {
      query: {
        limit: 20,
        offset: 0,
        parent_category_id: "pcat_root",
      },
      signal: null,
    })
    expect(result.categories).toStrictEqual([
      { id: "pcat_2", label: "Hoodies" },
    ])
    expect(result.count).toBe(1)
  })

  it("returns null and skips fetch when category id is missing", async () => {
    const sdk = createSdkMock()
    const service = createMedusaCategoryService(sdk as never)

    const result = await service.getCategory({})

    expect(result).toBeNull()
    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it("applies default detail fields and supports detail transforms", async () => {
    const sdk = createSdkMock()
    sdk.client.fetch.mockResolvedValueOnce({
      product_category: createCategory("pcat_3", "Jackets", "jackets"),
    } satisfies HttpTypes.StoreProductCategoryResponse)

    const service = createMedusaCategoryService<
      { slug: string; title: string },
      MedusaCategoryListInput
    >(sdk as never, {
      defaultDetailFields: "id,name,handle,parent_category_id",
      transformDetailCategory: (category) => ({
        slug: category.handle,
        title: category.name,
      }),
      transformListCategory: (category) => ({
        slug: category.handle,
        title: category.name,
      }),
    })

    const result = await service.getCategory({ enabled: true, id: "pcat_3" })

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/product-categories/pcat_3",
      {
        query: {
          fields: "id,name,handle,parent_category_id",
        },
        signal: null,
      },
    )
    expect(result).toStrictEqual({ slug: "jackets", title: "Jackets" })
  })
})
