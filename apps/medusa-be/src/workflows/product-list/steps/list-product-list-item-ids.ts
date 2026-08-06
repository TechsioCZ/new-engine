import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"

const PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE = 1000
const PRODUCT_LIST_ITEM_IDS_MAX_PAGES = 1000

export const listProductListItemIdsStep = createStep(
  "list-product-list-item-ids",
  async (listId: string, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const collectPage = async (
      pageIndex: number,
      itemIds: string[],
    ): Promise<string[]> => {
      if (pageIndex >= PRODUCT_LIST_ITEM_IDS_MAX_PAGES) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Product list "${listId}" exceeded the ${PRODUCT_LIST_ITEM_IDS_MAX_PAGES}-page item lookup limit.`,
        )
      }

      const items = await service.listProductListItems(
        { list_id: listId },
        {
          select: ["id"],
          skip: pageIndex * PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE,
          take: PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE,
        },
      )
      const nextItemIds = [...itemIds, ...items.map((item) => item.id)]

      return items.length < PRODUCT_LIST_ITEM_IDS_LOOKUP_CHUNK_SIZE
        ? nextItemIds
        : await collectPage(pageIndex + 1, nextItemIds)
    }

    return new StepResponse(await collectPage(0, []))
  },
)
