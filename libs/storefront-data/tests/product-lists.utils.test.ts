import { expect, describe, it } from "vitest"

import type {
  ProductListBase,
  ProductListItemBase,
} from "../src/product-lists/types"
import {
  findProductListItem,
  getProductListItemCount,
  isFavoriteProductList,
  isProductInProductList,
  resolveProductListItemQuantity,
} from "../src/product-lists/utils"

describe("product list utilities", () => {
  it("detects favorite lists and resolves item counts from backend counters", () => {
    expect(
      isFavoriteProductList({ id: "list_1", type: "favorite" })
    ).toBeTruthy()
    expect(
      isFavoriteProductList({ handle: "favorites", id: "list_2" })
    ).toBeTruthy()
    expect(
      getProductListItemCount({
        id: "list_3",
        item_count: 2,
        items: [{ id: "item_1" }],
        items_count: 4,
      })
    ).toBe(4)
    expect(
      getProductListItemCount({
        id: "list_4",
        item_count: 3,
        items: [{ id: "item_1" }],
      })
    ).toBe(3)
    expect(
      getProductListItemCount({
        id: "list_5",
        items: [{ id: "item_1" }, { id: "item_2" }],
      })
    ).toBe(2)
  })

  it("matches direct product fields and embedded variants", () => {
    const selectedItem: ProductListItemBase = {
      id: "item_1",
      product_id: "prod_1",
      variant_id: "var_1",
    }
    const embeddedItem: ProductListItemBase = {
      id: "item_2",
      product_id: "prod_2",
      variant: { id: "var_2" },
    }
    const list: ProductListBase = {
      id: "list_1",
      items: [selectedItem, embeddedItem],
    }

    expect(isProductInProductList(list, "prod_1", "var_1")).toBeTruthy()
    expect(isProductInProductList(list, "prod_1", "var_2")).toBeFalsy()
    expect(findProductListItem(list, "prod_2", "var_2")).toStrictEqual(
      embeddedItem
    )
  })

  it("normalizes display quantity to a positive integer", () => {
    expect(
      resolveProductListItemQuantity({ id: "item_1", quantity: 2.8 })
    ).toBe(2)
    expect(resolveProductListItemQuantity({ id: "item_2", quantity: 0 })).toBe(
      1
    )
    expect(resolveProductListItemQuantity({ id: "item_3" })).toBe(1)
  })
})
