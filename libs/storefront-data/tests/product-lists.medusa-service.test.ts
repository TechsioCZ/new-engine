import type Medusa from "@medusajs/js-sdk"
import { createMedusaProductListService } from "../src/product-lists/medusa-service"

const createSdkMock = (response: unknown = {}) =>
  ({
    client: {
      fetch: vi.fn().mockResolvedValue(response),
    },
  }) as unknown as Medusa

describe("createMedusaProductListService", () => {
  it("lists product lists with normalized pagination and forwards signal", async () => {
    const sdk = createSdkMock({
      product_lists: [{ id: "list_1", title: "Favorites" }],
      count: 1,
      limit: 12,
      offset: 24,
    })
    const service = createMedusaProductListService(sdk)
    const controller = new AbortController()

    const result = await service.listProductLists(
      {
        type: "custom",
        limit: 12,
        offset: 24,
      },
      controller.signal
    )

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/product-lists", {
      query: {
        type: "custom",
        limit: 12,
        offset: 24,
      },
      signal: controller.signal,
    })
    expect(result.productLists).toEqual([{ id: "list_1", title: "Favorites" }])
    expect(result.count).toBe(1)
  })

  it("adds favorite items with backend field names and normalized quantity", async () => {
    const sdk = createSdkMock({
      product_list_item: {
        id: "item_1",
        product_id: "prod_1",
        variant_id: "var_1",
        quantity: 2,
      },
    })
    const service = createMedusaProductListService(sdk)

    const item = await service.addFavoriteProductListItem({
      productId: "prod_1",
      variantId: "var_1",
      quantity: 2.9,
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/product-lists/favorites/items",
      {
        method: "POST",
        body: {
          product_id: "prod_1",
          variant_id: "var_1",
          quantity: 2,
        },
      }
    )
    expect(item).toEqual(
      expect.objectContaining({
        id: "item_1",
        quantity: 2,
      })
    )
  })

  it("rejects zero relative quantity changes before calling the backend", async () => {
    const sdk = createSdkMock()
    const service = createMedusaProductListService(sdk)

    await expect(
      service.changeProductListItemQuantity({
        itemId: "item_1",
        quantity: 0,
      })
    ).rejects.toThrow("Quantity change must be a non-zero integer.")

    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it("sends compact relative quantity payloads", async () => {
    const sdk = createSdkMock({
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

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/product-lists/items/item_1/change-quantity",
      {
        method: "POST",
        body: {
          quantity: 2,
        },
      }
    )
  })

  it("sends compact increment payloads with default quantity", async () => {
    const sdk = createSdkMock({
      product_list_item: {
        id: "item_1",
        quantity: 1,
      },
    })
    const service = createMedusaProductListService(sdk)

    await service.incrementProductListItem({
      itemId: "item_1",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/product-lists/items/item_1/increment",
      {
        method: "POST",
        body: {
          quantity: 1,
        },
      }
    )
  })

  it("creates a cart from a product list and maps storefront cart input fields", async () => {
    const sdk = createSdkMock({
      cart: {
        id: "cart_1",
        region_id: "reg_1",
      },
    })
    const service = createMedusaProductListService(sdk)

    const cart = await service.createProductListCart({
      listId: "list_1",
      regionId: "reg_1",
      countryCode: "sk",
      email: "customer@example.com",
      salesChannelId: "sc_1",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/product-lists/list_1/cart",
      {
        method: "POST",
        body: {
          region_id: "reg_1",
          country_code: "sk",
          email: "customer@example.com",
          sales_channel_id: "sc_1",
        },
      }
    )
    expect(cart).toEqual({
      id: "cart_1",
      region_id: "reg_1",
    })
  })
})
