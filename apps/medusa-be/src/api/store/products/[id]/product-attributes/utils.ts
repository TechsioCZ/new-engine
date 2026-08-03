import type { Query } from "@medusajs/framework/types"

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

export type StoreProductAttributeResponse = {
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

export const toPublicStoreProductAttributes = (
  assignments: TranslatedProductAttributeAssignment[]
) =>
  assignments.flatMap((assignment) => {
    const definition = assignment.definition
    if (!definition?.is_public) {
      return []
    }
    if (definition.input_type === "select" && !assignment.option) {
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
  assignments: TranslatedProductAttributeAssignment[],
  pagination: { limit: number; offset: number }
) => {
  const publicAssignments = toPublicStoreProductAttributes(assignments).sort(
    (left, right) =>
      left.definition.key.localeCompare(right.definition.key) ||
      left.id.localeCompare(right.id)
  )

  return {
    count: publicAssignments.length,
    product_attributes: publicAssignments.slice(
      pagination.offset,
      pagination.offset + pagination.limit
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
  const assignments: TranslatedProductAttributeAssignment[] = []
  let sourceOffset = 0
  let sourceCount = Number.POSITIVE_INFINITY

  while (sourceOffset < sourceCount) {
    const { data, metadata } = await query.graph(
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
      locale === undefined ? {} : { locale }
    )
    assignments.push(...(data as TranslatedProductAttributeAssignment[]))
    sourceCount = metadata?.count ?? assignments.length
    if (data.length === 0) {
      break
    }
    sourceOffset += data.length
  }

  return paginatePublicStoreProductAttributes(assignments, { limit, offset })
}
