import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"
import { resolveProductListItemVariant } from "./account-product-lists.utils"

describe("resolveProductListItemVariant", () => {
  it("uses the saved variant instead of the first product variant", () => {
    const product = {
      id: "prod_test",
      variants: [
        { id: "variant_first", title: "First" },
        { id: "variant_saved", title: "Saved" },
      ],
    } as HttpTypes.StoreProduct
    const item = {
      id: "item_test",
      variant_id: "variant_saved",
    } as StoreProductListItem

    expect(resolveProductListItemVariant(item, product)?.id).toBe(
      "variant_saved"
    )
  })

  it("does not replace a missing saved variant with another variant", () => {
    const product = {
      id: "prod_test",
      variants: [{ id: "variant_first", title: "First" }],
    } as HttpTypes.StoreProduct
    const item = {
      id: "item_test",
      variant_id: "variant_deleted",
    } as StoreProductListItem

    expect(resolveProductListItemVariant(item, product)).toBeNull()
  })

  it("uses the first variant when the list item has no saved variant", () => {
    const product = {
      id: "prod_test",
      variants: [{ id: "variant_first", title: "First" }],
    } as HttpTypes.StoreProduct
    const item = { id: "item_test" } as StoreProductListItem

    expect(resolveProductListItemVariant(item, product)?.id).toBe(
      "variant_first"
    )
  })
})
