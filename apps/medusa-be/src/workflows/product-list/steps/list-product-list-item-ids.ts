import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"

const PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE = 1000

export const listProductListItemIdsStep = createStep(
  "list-product-list-item-ids",
  async (listId: string, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const itemIds: string[] = []
    let skip = 0

    while (true) {
      const items = await service.listProductListItems(
        { list_id: listId },
        {
          select: ["id"],
          skip,
          take: PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE,
        }
      )

      itemIds.push(...items.map((item) => item.id))

      if (items.length < PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE) {
        return new StepResponse(itemIds)
      }

      skip += PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE
    }
  }
)
