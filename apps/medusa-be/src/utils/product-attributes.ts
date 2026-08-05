import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  InferTypeOf,
  MedusaContainer,
} from "@medusajs/framework/types"
import { MedusaError, toHandle } from "@medusajs/framework/utils"

import { PRODUCT_ATTRIBUTE_MODULE } from "../modules/product-attribute"
import type ProductAttribute from "../modules/product-attribute/models/product-attribute"
import type ProductAttributeDefinition from "../modules/product-attribute/models/product-attribute-definition"
import type ProductAttributeOption from "../modules/product-attribute/models/product-attribute-option"
import type ProductAttributeModuleService from "../modules/product-attribute/service"

export type ProductAttributeDefinitionRecord = InferTypeOf<
  typeof ProductAttributeDefinition
>
export type ProductAttributeOptionRecord = InferTypeOf<
  typeof ProductAttributeOption
>
export type ProductAttributeAssignmentRecord = InferTypeOf<
  typeof ProductAttribute
>

type SoftDeletableRecord = Pick<
  ProductAttributeDefinitionRecord,
  "deleted_at" | "id"
>

const PRODUCT_ATTRIBUTE_KEY_CONTENT_PATTERN = /[\p{L}\p{N}]/u

export const getProductAttributeProductLockKey = (productId: string) =>
  `product-attribute-product:${productId}`

export const normalizeProductAttributeKey = (value: string) =>
  PRODUCT_ATTRIBUTE_KEY_CONTENT_PATTERN.test(value) ? toHandle(value) : ""

export const normalizeRequiredProductAttributeKey = (
  value: string,
  field = "key",
) => {
  const key = normalizeProductAttributeKey(value)

  if (!key) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product Attribute ${field} must contain at least one letter or number.`,
    )
  }

  return key
}

export const assertProductAttributeKeyAvailable = ({
  collision,
  definitionKey,
  key,
  kind,
}: {
  collision?: SoftDeletableRecord
  definitionKey?: string
  key: string
  kind: "definition" | "option"
}) => {
  if (!collision) {
    return
  }

  const scope =
    kind === "option" && definitionKey
      ? ` for definition "${definitionKey}"`
      : ""
  const guidance = collision.deleted_at
    ? `Restore deleted ${kind} "${collision.id}" instead.`
    : "Use a different key."

  throw new MedusaError(
    MedusaError.Types.DUPLICATE_ERROR,
    `Product Attribute ${kind} key "${key}" already exists${scope}. ${guidance}`,
  )
}

export const partitionProductAttributeRecordIds = (
  records: SoftDeletableRecord[],
) => ({
  active_ids: records
    .filter((record) => !record.deleted_at)
    .map((record) => record.id),
  deleted_ids: records
    .filter((record) => Boolean(record.deleted_at))
    .map((record) => record.id),
})

export const getProductAttributeService = (container: MedusaContainer) =>
  container.resolve<ProductAttributeModuleService>(PRODUCT_ATTRIBUTE_MODULE)

export const withProductAttributeTransaction = async <T>(
  service: ProductAttributeModuleService,
  task: (context: Context<SqlEntityManager>) => Promise<T>,
  sharedContext: Context<SqlEntityManager> = {},
) => await service.runInTransaction(task, sharedContext)

export const toUsageCountMap = (
  rows: { count: number | string; id: string }[],
) =>
  new Map(
    rows.map((row) => {
      const count =
        typeof row.count === "number"
          ? row.count
          : Number.parseInt(row.count, 10)
      return [row.id, Number.isFinite(count) ? count : 0] as const
    }),
  )
