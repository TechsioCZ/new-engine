import { vi, describe, expect, it } from "vitest"

import { createMedusaCategoryService } from "../src/categories/medusa-service"
import type { MedusaCategoryListInput } from "../src/categories/medusa-service"
import { createTestMedusaSdk } from "./medusa-fixtures"

const createCategory = (id: string, name = "Category", handle = id) => ({
  handle,
  id,
  name,
})

const createSdkMock = (response: unknown = {}) => {
  const sdk = createTestMedusaSdk()
  const fetch = vi.fn<(path: string, options?: unknown) => Promise<unknown>>()
  fetch.mockResolvedValue(response)
  Object.defineProperty(sdk.client, "fetch", { value: fetch })
  return { fetch, sdk }
}

describe(createMedusaCategoryService, () => {
  it("applies default list fields and forwards signal", async () => {
    const { fetch, sdk } = createSdkMock({
      count: 1,
      product_categories: [createCategory("pcat_1", "T-Shirts", "t-shirts")],
    })
    const service = createMedusaCategoryService(sdk, {
      defaultListFields: "id,name,handle,parent_category_id",
    })
    const controller = new AbortController()

    await service.getCategories(
      { enabled: true, limit: 12, offset: 0 },
      controller.signal,
    )

    expect(fetch).toHaveBeenCalledWith("/store/product-categories", {
      query: {
        fields: "id,name,handle,parent_category_id",
        limit: 12,
        offset: 0,
      },
      signal: controller.signal,
    })
  })

  it("supports custom list query normalization and list transforms", async () => {
    const { fetch, sdk } = createSdkMock({
      count: 1,
      product_categories: [createCategory("pcat_2", "Hoodies", "hoodies")],
    })
    const service = createMedusaCategoryService<
      { id: string; label: string },
      MedusaCategoryListInput & { parent?: string }
    >(sdk, {
      normalizeListQuery: ({ parent, ...params }) => ({
        ...params,
        ...(parent !== undefined && parent.length > 0
          ? { parent_category_id: parent }
          : {}),
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

    expect(fetch).toHaveBeenCalledWith("/store/product-categories", {
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
    const { fetch, sdk } = createSdkMock()
    const service = createMedusaCategoryService(sdk)

    const result = await service.getCategory({})

    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("applies default detail fields and supports detail transforms", async () => {
    const { fetch, sdk } = createSdkMock()
    fetch.mockResolvedValueOnce({
      product_category: createCategory("pcat_3", "Jackets", "jackets"),
    })

    const service = createMedusaCategoryService<{
      slug: string
      title: string
    }>(sdk, {
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

    expect(fetch).toHaveBeenCalledWith("/store/product-categories/pcat_3", {
      query: {
        fields: "id,name,handle,parent_category_id",
      },
      signal: null,
    })
    expect(result).toStrictEqual({ slug: "jackets", title: "Jackets" })
  })
})
