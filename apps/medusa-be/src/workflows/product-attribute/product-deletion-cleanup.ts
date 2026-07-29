import type { ILockingModule } from "@medusajs/framework/types"
import {
  getProductAttributeProductLockKey,
  type getProductAttributeService,
  type ProductAttributeAssignmentRecord,
  partitionProductAttributeRecordIds,
} from "../../utils/product-attributes"

export type ProductAttributeDeletionCompensation = {
  assignment_ids: string[]
  product_ids: string[]
}

const getProductLockKeys = (productIds: string[]) =>
  [...new Set(productIds)]
    .sort()
    .map((productId) => getProductAttributeProductLockKey(productId))

export const cleanupDeletedProductAttributes = async ({
  lockingModule,
  productIds,
  service,
}: {
  lockingModule: ILockingModule
  productIds: string[]
  service: ReturnType<typeof getProductAttributeService>
}): Promise<ProductAttributeDeletionCompensation> => {
  const lockKeys = getProductLockKeys(productIds)
  if (!lockKeys.length) {
    return { assignment_ids: [], product_ids: [] }
  }

  const assignmentIds = await lockingModule.execute(
    lockKeys,
    async () => {
      const assignments = (await service.listProductAttributes(
        { product_id: { $in: productIds } },
        { take: undefined }
      )) as ProductAttributeAssignmentRecord[]
      const { active_ids: activeIds } =
        partitionProductAttributeRecordIds(assignments)

      if (activeIds.length) {
        await service.softDeleteProductAttributes(activeIds)
      }
      return activeIds
    },
    { timeout: 5 }
  )

  return { assignment_ids: assignmentIds, product_ids: productIds }
}

export const restoreDeletedProductAttributes = async ({
  compensation,
  lockingModule,
  service,
}: {
  compensation: ProductAttributeDeletionCompensation
  lockingModule: ILockingModule
  service: ReturnType<typeof getProductAttributeService>
}) => {
  if (!compensation.assignment_ids.length) {
    return
  }

  await lockingModule.execute(
    getProductLockKeys(compensation.product_ids),
    async () => {
      await service.restoreProductAttributes(compensation.assignment_ids)
    },
    { timeout: 5 }
  )
}
