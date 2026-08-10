import type { Query } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { getRecordValue } from "@techsio/std/object"

import type {
  ProductAttributeAssignmentRecord,
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../../../../../utils/product-attributes"

const PRODUCT_ATTRIBUTE_READ_BATCH_SIZE = 100
const PRODUCT_ATTRIBUTE_STORE_FIELDS = [
  "id",
  "text_value",
  "definition.id",
  "definition.key",
  "definition.label",
  "definition.input_type",
  "definition.is_public",
  "option.id",
  "option.key",
  "option.label",
]

export interface StoreProductAttributeResponse {
  definition: {
    id: string
    input_type: "select" | "text"
    key: string
    label: string
  }
  id: string
  option: {
    id: string
    key: string
    label: string
  } | null
  text_value: string | null
}

export type TranslatedProductAttributeAssignment = Omit<
  ProductAttributeAssignmentRecord,
  "definition" | "option"
> & {
  definition?: ProductAttributeDefinitionRecord
  option?: ProductAttributeOptionRecord | null
}

type StoreProductAttributeProjection = Pick<
  TranslatedProductAttributeAssignment,
  "id" | "text_value"
> & {
  definition?: Pick<
    ProductAttributeDefinitionRecord,
    "id" | "input_type" | "is_public" | "key" | "label"
  >
  option?: Pick<ProductAttributeOptionRecord, "id" | "key" | "label"> | null
}

const isProductAttributeObjectLike = (value: unknown): value is object =>
  typeof value === "object" && value !== null

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

const isDefinitionProjection = (
  value: unknown,
): value is NonNullable<StoreProductAttributeProjection["definition"]> => {
  if (!isProductAttributeObjectLike(value)) {
    return false
  }

  const id = getRecordValue(value, "id")
  const inputType = getRecordValue(value, "input_type")
  const isPublic = getRecordValue(value, "is_public")
  const key = getRecordValue(value, "key")
  const label = getRecordValue(value, "label")
  const hasValidInputType = inputType === "select" || inputType === "text"
  const stringFieldsAreValid = [id, key, label].every(
    (field) => typeof field === "string",
  )
  return (
    stringFieldsAreValid && hasValidInputType && typeof isPublic === "boolean"
  )
}

const isOptionProjection = (
  value: unknown,
): value is NonNullable<StoreProductAttributeProjection["option"]> => {
  if (!isProductAttributeObjectLike(value)) {
    return false
  }

  const id = getRecordValue(value, "id")
  const key = getRecordValue(value, "key")
  const label = getRecordValue(value, "label")
  return (
    typeof id === "string" &&
    typeof key === "string" &&
    typeof label === "string"
  )
}

const isStoreProductAttributeProjection = (
  value: unknown,
): value is StoreProductAttributeProjection => {
  if (
    !isProductAttributeObjectLike(value) ||
    typeof getRecordValue(value, "id") !== "string"
  ) {
    return false
  }

  const definition = getRecordValue(value, "definition")
  const option = getRecordValue(value, "option")
  const textValue = getRecordValue(value, "text_value")
  if (definition !== undefined && !isDefinitionProjection(definition)) {
    return false
  }
  if (option !== undefined && option !== null && !isOptionProjection(option)) {
    return false
  }

  return textValue === null || typeof textValue === "string"
}

export const toPublicStoreProductAttributes = (
  assignments: readonly StoreProductAttributeProjection[],
) =>
  assignments.flatMap((assignment) => {
    const { definition } = assignment
    if (definition?.is_public !== true) {
      return []
    }
    if (
      definition.input_type === "select" &&
      (assignment.option === undefined || assignment.option === null)
    ) {
      return []
    }

    return [
      {
        definition: {
          id: definition.id,
          input_type: definition.input_type,
          key: definition.key,
          label: definition.label,
        },
        id: assignment.id,
        option: assignment.option
          ? {
              id: assignment.option.id,
              key: assignment.option.key,
              label: assignment.option.label,
            }
          : null,
        text_value:
          definition.input_type === "text"
            ? (assignment.text_value ?? null)
            : null,
      } satisfies StoreProductAttributeResponse,
    ]
  })

export const paginatePublicStoreProductAttributes = (
  assignments: readonly StoreProductAttributeProjection[],
  pagination: { limit: number; offset: number },
) => {
  const publicAssignments = toPublicStoreProductAttributes(
    assignments,
  ).toSorted(
    (left, right) =>
      left.definition.key.localeCompare(right.definition.key) ||
      left.id.localeCompare(right.id),
  )

  return {
    count: publicAssignments.length,
    product_attributes: publicAssignments.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    ),
  }
}

export const listPublicStoreProductAttributes = async ({
  limit,
  locale,
  offset,
  productId,
  query,
}: {
  limit: number
  locale?: string
  offset: number
  productId: string
  query: Query
}) => {
  const assignments: StoreProductAttributeProjection[] = []
  let sourceOffset = 0
  let sourceCount = Number.POSITIVE_INFINITY

  const processPage = async function processPage(): Promise<void> {
    if (sourceOffset >= sourceCount) {
      return
    }

    const result: unknown = await query.graph(
      {
        entity: "product_attribute",
        fields: PRODUCT_ATTRIBUTE_STORE_FIELDS,
        filters: { product_id: productId },
        pagination: {
          order: { id: "ASC" },
          skip: sourceOffset,
          take: PRODUCT_ATTRIBUTE_READ_BATCH_SIZE,
        },
      },
      locale === undefined ? {} : { locale },
    )
    if (!isProductAttributeObjectLike(result)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product Attribute query returned an invalid result",
      )
    }

    const page = getRecordValue(result, "data")
    const metadata = getRecordValue(result, "metadata")
    if (!isUnknownArray(page)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product Attribute query returned an invalid result",
      )
    }
    if (!page.every(isStoreProductAttributeProjection)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product Attribute query returned an invalid assignment",
      )
    }

    assignments.push(...page)
    const metadataCount: unknown = isProductAttributeObjectLike(metadata)
      ? getRecordValue(metadata, "count")
      : undefined
    sourceCount =
      typeof metadataCount === "number" ? metadataCount : assignments.length
    if (page.length === 0) {
      return
    }
    sourceOffset += page.length
    await processPage()
  }

  await processPage()
  return paginatePublicStoreProductAttributes(assignments, { limit, offset })
}
