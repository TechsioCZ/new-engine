import type { ILockingModule } from "@medusajs/framework/types"

import {
  getProductAttributeProductLockKey,
  partitionProductAttributeRecordIds,
} from "../../utils/product-attributes"
import type { ProductAttributeAssignmentRecord } from "../../utils/product-attributes"

export interface ProductAttributeDeletionCompensation {
  assignment_ids: string[]
  product_ids: string[]
}

// Cleanup only reads deletion state and ids, so the port stays narrow enough to
// be satisfied by the module service and by fully typed test doubles.
export type ProductAttributeDeletionRecord = Pick<
  ProductAttributeAssignmentRecord,
  "deleted_at" | "id"
>

export interface ProductAttributeDeletionService {
  listProductAttributes: (
    filters: { product_id: { $in: string[] } },
    config: {
      order: { id: "ASC" }
      skip: number
      take: number
      withDeleted: boolean
    },
  ) => Promise<ProductAttributeDeletionRecord[]>
  restoreProductAttributes: (ids: string[]) => Promise<unknown>
  softDeleteProductAttributes: (ids: string[]) => Promise<unknown>
}

export type ProductAttributeDeletionLock = Pick<ILockingModule, "execute">

const ASSIGNMENT_BATCH_SIZE = 100

const processAssignmentBatches = async (
  assignmentIds: string[],
  task: (batch: string[]) => Promise<unknown>,
  offset = 0,
): Promise<void> => {
  if (offset >= assignmentIds.length) {
    return
  }

  await task(assignmentIds.slice(offset, offset + ASSIGNMENT_BATCH_SIZE))
  await processAssignmentBatches(
    assignmentIds,
    task,
    offset + ASSIGNMENT_BATCH_SIZE,
  )
}

const getProductLockKeys = (productIds: string[]) =>
  [...new Set(productIds)]
    .toSorted()
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
        const processPage = async function processPage(): Promise<void> {
          const assignments = await service.listProductAttributes(
            { product_id: { $in: productIds } },
            {
              order: { id: "ASC" },
              skip: offset,
              take: ASSIGNMENT_BATCH_SIZE,
              withDeleted: true,
            },
          )
          if (assignments.length === 0) {
            return
          }

          const { active_ids: activeIds } =
            partitionProductAttributeRecordIds(assignments)
          await processAssignmentBatches(activeIds, async (batch) => {
            await service.softDeleteProductAttributes(batch)
            deletedIds.push(...batch)
          })
          offset += assignments.length
          await processPage()
        }

        await processPage()
      } catch (error) {
        await processAssignmentBatches(deletedIds, async (batch) => {
          await service.restoreProductAttributes(batch)
        })
        throw error
      }

      return deletedIds
    },
    { timeout: 5 },
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
      await processAssignmentBatches(
        compensation.assignment_ids,
        async (batch) => {
          await service.restoreProductAttributes(batch)
        },
      )
    },
    { timeout: 5 },
  )
}
