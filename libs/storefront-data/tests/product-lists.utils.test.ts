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
    expect(isFavoriteProductList({ id: "list_1", type: "favorite" })).toBe(true)
    expect(isFavoriteProductList({ id: "list_2", handle: "favorites" })).toBe(
      true
    )
    expect(
      getProductListItemCount({
        id: "list_3",
        items_count: 4,
        item_count: 2,
        items: [{ id: "item_1" }],
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

  it("matches products and variants from direct fields or embedded entities", () => {
    const selectedItem: ProductListItemBase = {
      id: "item_1",
      product_id: "prod_1",
      variant_id: "var_1",
    }
    const embeddedItem: ProductListItemBase = {
      id: "item_2",
      product: { id: "prod_2" } as ProductListItemBase["product"],
      variant: { id: "var_2" },
    }
    const list: ProductListBase<ProductListItemBase> = {
      id: "list_1",
      items: [selectedItem, embeddedItem],
    }

    expect(isProductInProductList(list, "prod_1", "var_1")).toBe(true)
    expect(isProductInProductList(list, "prod_1", "var_2")).toBe(false)
    expect(findProductListItem(list, "prod_2", "var_2")).toEqual(embeddedItem)
  })

  it("normalizes display quantity to a positive integer", () => {
    expect(resolveProductListItemQuantity({ id: "item_1", quantity: 2.8 })).toBe(
      2
    )
    expect(resolveProductListItemQuantity({ id: "item_2", quantity: 0 })).toBe(1)
    expect(resolveProductListItemQuantity({ id: "item_3" })).toBe(1)
  })
})
