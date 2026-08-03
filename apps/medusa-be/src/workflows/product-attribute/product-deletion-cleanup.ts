import type { ILockingModule } from "@medusajs/framework/types"

import {
  getProductAttributeProductLockKey,
  type ProductAttributeAssignmentRecord,
  partitionProductAttributeRecordIds,
} from "../../utils/product-attributes"

export type ProductAttributeDeletionCompensation = {
  assignment_ids: string[]
  product_ids: string[]
}

// Cleanup only reads deletion state and ids, so the port stays narrow enough to
// be satisfied by the module service and by fully typed test doubles.
export type ProductAttributeDeletionRecord = Pick<
  ProductAttributeAssignmentRecord,
  "deleted_at" | "id"
>

export type ProductAttributeDeletionService = {
  listProductAttributes: (
    filters: { product_id: { $in: string[] } },
    config: {
      order: { id: "ASC" }
      skip: number
      take: number
      withDeleted: boolean
    }
  ) => Promise<ProductAttributeDeletionRecord[]>
  restoreProductAttributes: (ids: string[]) => Promise<unknown>
  softDeleteProductAttributes: (ids: string[]) => Promise<unknown>
}

export type ProductAttributeDeletionLock = Pick<ILockingModule, "execute">

const ASSIGNMENT_BATCH_SIZE = 100

const getProductLockKeys = (productIds: string[]) =>
  [...new Set(productIds)]
    .sort()
    .map((productId) => getProductAttributeProductLockKey(productId))

export const cleanupDeletedProductAttributes = async ({
  lockingModule,
  productIds,
  service,
}: {
  lockingModule: ProductAttributeDeletionLock
  productIds: string[]
  service: ProductAttributeDeletionService
}): Promise<ProductAttributeDeletionCompensation> => {
  const lockKeys = getProductLockKeys(productIds)
  if (!lockKeys.length) {
    return { assignment_ids: [], product_ids: [] }
  }

  const assignmentIds = await lockingModule.execute(
    lockKeys,
    async () => {
      const deletedIds: string[] = []
      let offset = 0

      try {
        while (true) {
          const assignments = await service.listProductAttributes(
            { product_id: { $in: productIds } },
            {
              order: { id: "ASC" },
              skip: offset,
              take: ASSIGNMENT_BATCH_SIZE,
              withDeleted: true,
            }
          )
          if (!assignments.length) {
            break
          }

          const { active_ids: activeIds } =
            partitionProductAttributeRecordIds(assignments)
          for (
            let index = 0;
            index < activeIds.length;
            index += ASSIGNMENT_BATCH_SIZE
          ) {
            const batch = activeIds.slice(index, index + ASSIGNMENT_BATCH_SIZE)
            await service.softDeleteProductAttributes(batch)
            deletedIds.push(...batch)
          }
          offset += assignments.length
        }
      } catch (error) {
        for (
          let index = 0;
          index < deletedIds.length;
          index += ASSIGNMENT_BATCH_SIZE
        ) {
          await service.restoreProductAttributes(
            deletedIds.slice(index, index + ASSIGNMENT_BATCH_SIZE)
          )
        }
        throw error
      }

      return deletedIds
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
  lockingModule: ProductAttributeDeletionLock
  service: Pick<ProductAttributeDeletionService, "restoreProductAttributes">
}) => {
  if (!compensation.assignment_ids.length) {
    return
  }

  await lockingModule.execute(
    getProductLockKeys(compensation.product_ids),
    async () => {
      for (
        let index = 0;
        index < compensation.assignment_ids.length;
        index += ASSIGNMENT_BATCH_SIZE
      ) {
        await service.restoreProductAttributes(
          compensation.assignment_ids.slice(
            index,
            index + ASSIGNMENT_BATCH_SIZE
          )
        )
      }
    },
    { timeout: 5 }
  )
}
