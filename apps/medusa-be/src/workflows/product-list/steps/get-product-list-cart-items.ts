import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ProductListItemVariantLink } from "../../../links/product-list-item-variant"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import { toProductListItemVariantLinks } from "../../../utils/product-list-links"

const PRODUCT_LIST_CART_ITEMS_LOOKUP_CHUNK_SIZE = 1000

export type ProductListCartItem = {
  variant_id: string
  quantity: number
}

type ProductListItemRecord = {
  id: string
  quantity: number
}

const addItemQuantitiesByVariantId = (
  items: ProductListItemRecord[],
  variantIdsByItemId: Map<string, string>,
  quantitiesByVariantId: Map<string, number>
) => {
  for (const item of items) {
    const variantId = variantIdsByItemId.get(item.id)

    if (!variantId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Product list item ${item.id} has no variant selected`
      )
    }

    quantitiesByVariantId.set(
      variantId,
      (quantitiesByVariantId.get(variantId) ?? 0) + item.quantity
    )
  }
}

export const getProductListCartItemsStep = createStep(
  "get-product-list-cart-items",
  async (listId: string, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const quantitiesByVariantId = new Map<string, number>()
    let skip = 0

    while (true) {
      const items = await service.listProductListItems(
        {
          list_id: listId,
        },
        {
          order: { sort_order: "ASC", created_at: "ASC" },
          skip,
          take: PRODUCT_LIST_CART_ITEMS_LOOKUP_CHUNK_SIZE,
        }
      )

      if (!items.length && skip === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Product list ${listId} has no items to order`
        )
      }

      const itemIds = items.map((item) => item.id)

      if (itemIds.length) {
        const { data: variantLinks } = await query.graph({
          entity: ProductListItemVariantLink.entryPoint,
          fields: ["product_list_item_id", "product_variant_id"],
          filters: {
            product_list_item_id: { $in: itemIds },
          },
          pagination: {
            take: itemIds.length,
          },
        })
        const variantIdsByItemId = new Map(
          toProductListItemVariantLinks(variantLinks).flatMap((link) =>
            link.product_list_item_id && link.product_variant_id
              ? [[link.product_list_item_id, link.product_variant_id]]
              : []
          )
        )

        addItemQuantitiesByVariantId(
          items,
          variantIdsByItemId,
          quantitiesByVariantId
        )
      }

      if (items.length < PRODUCT_LIST_CART_ITEMS_LOOKUP_CHUNK_SIZE) {
        break
      }

      skip += PRODUCT_LIST_CART_ITEMS_LOOKUP_CHUNK_SIZE
    }

    const cartItems: ProductListCartItem[] = Array.from(
      quantitiesByVariantId.entries()
    ).map(([variant_id, quantity]) => ({
      quantity,
      variant_id,
    }))

    return new StepResponse(cartItems)
  }
)
