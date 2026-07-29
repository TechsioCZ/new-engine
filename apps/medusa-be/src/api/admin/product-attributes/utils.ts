import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  getProductAttributeService,
  type ProductAttributeAssignmentRecord,
  type ProductAttributeDefinitionRecord,
  type ProductAttributeOptionRecord,
  toUsageCountMap,
} from "../../../utils/product-attributes"

export type ProductAttributeListStatus = "active" | "all" | "deleted"

const LIKE_WILDCARD_REGEX = /[\\%_]/g
const LEADING_DASH_REGEX = /^-/
const ORDER_FIELDS = new Set(["key", "label", "created_at", "updated_at"])
const PRODUCT_ATTRIBUTE_DETAIL_BATCH_SIZE = 100

export const listAllProductAttributeRecords = async <T>(
  listPage: (skip: number, take: number) => Promise<[T[], number]>
) => {
  const records: T[] = []
  let count = Number.POSITIVE_INFINITY

  while (records.length < count) {
    const [page, total] = await listPage(
      records.length,
      PRODUCT_ATTRIBUTE_DETAIL_BATCH_SIZE
    )
    records.push(...page)
    count = total

    if (page.length === 0) {
      break
    }
  }

  return records
}

export const escapeProductAttributeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

export const parseProductAttributeOrder = (input?: string) => {
  const value = input ?? "label"
  const direction: "ASC" | "DESC" = value.startsWith("-") ? "DESC" : "ASC"
  const requestedField = value.replace(LEADING_DASH_REGEX, "")
  const field = ORDER_FIELDS.has(requestedField) ? requestedField : "label"
  return { [field]: direction }
}

export const applyProductAttributeStatusFilter = (
  filters: Record<string, unknown>,
  status: ProductAttributeListStatus
) => {
  if (status === "active") {
    filters.deleted_at = null
  } else if (status === "deleted") {
    filters.deleted_at = { $ne: null }
  }
  return filters
}

export const retrieveProductAttributeDefinitionOrThrow = async (
  scope: MedusaContainer,
  id: string,
  withDeleted = false
) => {
  const definitions = (await getProductAttributeService(
    scope
  ).listProductAttributeDefinitions(
    { id },
    { take: 1, withDeleted }
  )) as ProductAttributeDefinitionRecord[]
  const definition = definitions[0]

  if (!definition) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product Attribute definition "${id}" was not found.`
    )
  }
  return definition
}

export const retrieveProductAttributeOptionOrThrow = async (
  scope: MedusaContainer,
  id: string,
  withDeleted = false
) => {
  const options = (await getProductAttributeService(
    scope
  ).listProductAttributeOptions(
    { id },
    { take: 1, withDeleted }
  )) as ProductAttributeOptionRecord[]
  const option = options[0]

  if (!option) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product Attribute option "${id}" was not found.`
    )
  }
  return option
}

export const getDefinitionUsageCountMap = async (
  scope: MedusaContainer,
  ids: string[]
) =>
  toUsageCountMap(
    await getProductAttributeService(scope).getActiveDefinitionUsageCounts(ids)
  )

export const getOptionUsageCountMap = async (
  scope: MedusaContainer,
  ids: string[]
) =>
  toUsageCountMap(
    await getProductAttributeService(scope).getActiveOptionUsageCounts(ids)
  )

export const toProductAttributeDefinitionResponse = (
  definition: ProductAttributeDefinitionRecord,
  usageCount: number
) => ({
  created_at: definition.created_at,
  deleted_at: definition.deleted_at ?? null,
  id: definition.id,
  input_type: definition.input_type,
  is_public: definition.is_public,
  key: definition.key,
  label: definition.label,
  updated_at: definition.updated_at,
  usage_count: usageCount,
})

export const toProductAttributeOptionResponse = (
  option: ProductAttributeOptionRecord,
  usageCount: number
) => ({
  created_at: option.created_at,
  definition_id: option.definition_id,
  deleted_at: option.deleted_at ?? null,
  id: option.id,
  key: option.key,
  label: option.label,
  updated_at: option.updated_at,
  usage_count: usageCount,
})

export const getProductAttributeDetail = async (
  scope: MedusaContainer,
  productId: string
) => {
  const service = getProductAttributeService(scope)
  const [definitions, options, assignments] = await Promise.all([
    listAllProductAttributeRecords(
      async (skip, take) =>
        (await service.listAndCountProductAttributeDefinitions(
          {},
          {
            order: { label: "ASC" },
            skip,
            take,
            withDeleted: true,
          }
        )) as [ProductAttributeDefinitionRecord[], number]
    ),
    listAllProductAttributeRecords(
      async (skip, take) =>
        (await service.listAndCountProductAttributeOptions(
          {},
          { order: { label: "ASC" }, skip, take }
        )) as [ProductAttributeOptionRecord[], number]
    ),
    listAllProductAttributeRecords(
      async (skip, take) =>
        (await service.listAndCountProductAttributes(
          { product_id: productId },
          { skip, take }
        )) as [ProductAttributeAssignmentRecord[], number]
    ),
  ])
  const activeOptionIds = new Set(options.map((option) => option.id))
  const assignmentByDefinitionId = new Map(
    assignments.map((assignment) => [assignment.definition_id, assignment])
  )
  const optionsByDefinitionId = new Map<
    string,
    ProductAttributeOptionRecord[]
  >()

  for (const option of options) {
    const current = optionsByDefinitionId.get(option.definition_id) ?? []
    current.push(option)
    optionsByDefinitionId.set(option.definition_id, current)
  }

  return definitions
    .filter(
      (definition) =>
        !definition.deleted_at || assignmentByDefinitionId.has(definition.id)
    )
    .map((definition) => {
      const assignment = assignmentByDefinitionId.get(definition.id)
      const selectedOption =
        assignment?.option_id && activeOptionIds.has(assignment.option_id)
          ? (options.find((option) => option.id === assignment.option_id) ??
            null)
          : null

      return {
        assignment:
          assignment &&
          !definition.deleted_at &&
          (definition.input_type === "text" || selectedOption !== null)
            ? {
                id: assignment.id,
                option_id: selectedOption?.id ?? null,
                text_value:
                  definition.input_type === "text"
                    ? (assignment.text_value ?? null)
                    : null,
              }
            : null,
        definition: toProductAttributeDefinitionResponse(definition, 0),
        options: (optionsByDefinitionId.get(definition.id) ?? []).map(
          (option) => toProductAttributeOptionResponse(option, 0)
        ),
      }
    })
}
