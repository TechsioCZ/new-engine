import type { ILockingModule } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { getProductAttributeService } from "../../utils/product-attributes"
import {
  cleanupDeletedProductAttributes,
  type ProductAttributeDeletionCompensation,
  restoreDeletedProductAttributes,
} from "../product-attribute/product-deletion-cleanup"

deleteProductsWorkflow.hooks.productsDeleted(
  async ({ ids }, { container }) => {
    const service = getProductAttributeService(container)
    const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)
    const compensation = await cleanupDeletedProductAttributes({
      lockingModule,
      productIds: ids,
      service,
    })

    return new StepResponse(undefined, compensation)
  },
  async (
    compensation: ProductAttributeDeletionCompensation | undefined,
    { container }
  ) => {
    if (compensation) {
      await restoreDeletedProductAttributes({
        compensation,
        lockingModule: container.resolve<ILockingModule>(Modules.LOCKING),
        service: getProductAttributeService(container),
      })
    }
  }
)
