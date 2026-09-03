import type { ILockingModule } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import type { StepExecutionContext } from "@medusajs/framework/workflows-sdk"
import { getProductAttributeService } from "../../utils/product-attributes"
import {
  cleanupDeletedProductAttributes,
  type ProductAttributeDeletionCompensation,
  restoreDeletedProductAttributes,
} from "../product-attribute/product-deletion-cleanup"

type ProductAttributeHookContext = Pick<StepExecutionContext, "container">

export const deleteAttributesForDeletedProducts = async (
  productIds: string[],
  { container }: ProductAttributeHookContext
) => {
  const service = getProductAttributeService(container)
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  return await cleanupDeletedProductAttributes({
    lockingModule,
    productIds,
    service,
  })
}

export const restoreAttributesForDeletedProducts = async (
  compensation: ProductAttributeDeletionCompensation | undefined,
  { container }: ProductAttributeHookContext
) => {
  if (compensation) {
    await restoreDeletedProductAttributes({
      compensation,
      lockingModule: container.resolve<ILockingModule>(Modules.LOCKING),
      service: getProductAttributeService(container),
    })
  }
}
