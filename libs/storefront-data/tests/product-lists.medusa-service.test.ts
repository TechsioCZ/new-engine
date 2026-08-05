import { vi, describe, expect, it } from "vitest"

import { createMedusaProductListService } from "../src/product-lists/medusa-service"
import { createTestMedusaSdk } from "./medusa-fixtures"

const createSdkMock = (response: unknown = {}) => {
  const sdk = createTestMedusaSdk()
  const fetch = vi.fn().mockResolvedValue(response)
  Object.defineProperty(sdk.client, "fetch", { value: fetch })
  return { fetch, sdk }
}

describe(createMedusaProductListService, () => {
  it("lists product lists with normalized pagination and forwards signal", async () => {
    const { fetch, sdk } = createSdkMock({
      count: 1,
      limit: 12,
      offset: 24,
      product_lists: [{ id: "list_1", title: "Favorites" }],
    })
    const service = createMedusaProductListService(sdk)
    const controller = new AbortController()

    const result = await service.listProductLists(
      {
        limit: 12,
        offset: 24,
        type: "custom",
      },
      controller.signal,
    )

    expect(fetch).toHaveBeenCalledWith("/store/product-lists", {
      query: {
        limit: 12,
        offset: 24,
        type: "custom",
      },
      signal: controller.signal,
    })
    expect(result.productLists).toStrictEqual([
      { id: "list_1", title: "Favorites" },
    ])
    expect(result.count).toBe(1)
  })

  it("adds favorite items with backend field names and normalized quantity", async () => {
    const { fetch, sdk } = createSdkMock({
      product_list_item: {
        id: "item_1",
        product_id: "prod_1",
        quantity: 2,
        variant_id: "var_1",
      },
    })
    const service = createMedusaProductListService(sdk)

    const item = await service.addFavoriteProductListItem({
      productId: "prod_1",
      quantity: 2.9,
      variantId: "var_1",
    })

    expect(fetch).toHaveBeenCalledWith("/store/product-lists/favorites/items", {
      body: {
        product_id: "prod_1",
        quantity: 2,
        variant_id: "var_1",
      },
      method: "POST",
    })
    expect(item).toStrictEqual(
      expect.objectContaining({
        id: "item_1",
        quantity: 2,
      }),
    )
  })

  it("rejects zero relative quantity changes before calling the backend", async () => {
    const { fetch, sdk } = createSdkMock()
    const service = createMedusaProductListService(sdk)

    await expect(
      service.changeProductListItemQuantity({
        itemId: "item_1",
        quantity: 0,
      }),
    ).rejects.toThrow("Quantity change must be a non-zero integer.")

    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends compact relative quantity payloads", async () => {
    const { fetch, sdk } = createSdkMock({
      product_list_item: {
        id: "item_1",
        quantity: 2,
      },
    })
    const service = createMedusaProductListService(sdk)

    await service.changeProductListItemQuantity({
      itemId: "item_1",
      quantity: 2.9,
    })

    expect(fetch).toHaveBeenCalledWith(
      "/store/product-lists/items/item_1/change-quantity",
      {
        body: {
          quantity: 2,
        },
        method: "POST",
      },
    )
  })

  it("sends compact increment payloads with default quantity", async () => {
    const { fetch, sdk } = createSdkMock({
      product_list_item: {
        id: "item_1",
        quantity: 1,
      },
    })
    const service = createMedusaProductListService(sdk)

    await service.incrementProductListItem({
      itemId: "item_1",
    })

    expect(fetch).toHaveBeenCalledWith(
      "/store/product-lists/items/item_1/increment",
      {
        body: {
          quantity: 1,
        },
        method: "POST",
      },
    )
  })

  it("creates a cart from a product list and maps storefront cart input fields", async () => {
    const { fetch, sdk } = createSdkMock({
      cart: {
        id: "cart_1",
        region_id: "reg_1",
      },
    })
    const service = createMedusaProductListService(sdk)

    const cart = await service.createProductListCart({
      countryCode: "sk",
      email: "customer@example.com",
      listId: "list_1",
      regionId: "reg_1",
      salesChannelId: "sc_1",
    })

    expect(fetch).toHaveBeenCalledWith("/store/product-lists/list_1/cart", {
      body: {
        country_code: "sk",
        email: "customer@example.com",
        region_id: "reg_1",
        sales_channel_id: "sc_1",
      },
      method: "POST",
    })
    expect(cart).toStrictEqual({
      id: "cart_1",
      region_id: "reg_1",
    })
  })
})
