import type {
  IProductModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import {
  getProductAttributeService,
  toUsageCountMap,
} from "../../../utils/product-attributes"
import type {
  ProductAttributeAssignmentRecord,
  ProductAttributeDefinitionRecord,
  ProductAttributeOptionRecord,
} from "../../../utils/product-attributes"

export type ProductAttributeListStatus = "active" | "all" | "deleted"

const LIKE_WILDCARD_REGEX = /[\\%_]/g
const LEADING_DASH_REGEX = /^-/
const ORDER_FIELDS = new Set(["key", "label", "created_at", "updated_at"])
const ASSIGNED_PRODUCT_ORDER_FIELDS = new Set([
  "handle",
  "status",
  "title",
  "updated_at",
])
const ASSIGNMENT_QUERY_BATCH_SIZE = 100
const PRODUCT_ATTRIBUTE_DETAIL_BATCH_SIZE = 100

export const listAllProductAttributeRecords = async <T>(
  listPage: (skip: number, take: number) => Promise<[T[], number]>,
) => {
  const records: T[] = []
  let count = Number.POSITIVE_INFINITY

  while (records.length < count) {
    const [page, total] = await listPage(
      records.length,
      PRODUCT_ATTRIBUTE_DETAIL_BATCH_SIZE,
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

export const parseProductAttributeOrder = (value: string = "label") => {
  const direction: "ASC" | "DESC" = value.startsWith("-") ? "DESC" : "ASC"
  const requestedField = value.replace(LEADING_DASH_REGEX, "")
  const field = ORDER_FIELDS.has(requestedField) ? requestedField : "label"
  return { [field]: direction, id: "ASC" as const }
}

export const applyProductAttributeStatusFilter = (
  filters: Record<string, unknown>,
  status: ProductAttributeListStatus,
) => {
  if (status === "active") {
    filters["deleted_at"] = null
  } else if (status === "deleted") {
    filters["deleted_at"] = { $ne: null }
  }
  return filters
}

export const retrieveProductAttributeDefinitionOrThrow = async (
  scope: MedusaContainer,
  id: string,
  withDeleted = false,
) => {
  const definitions = await getProductAttributeService(
    scope,
  ).listProductAttributeDefinitions({ id }, { take: 1, withDeleted })
  const definition = definitions[0]

  if (!definition) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product Attribute definition "${id}" was not found.`,
    )
  }
  return definition
}

export const retrieveProductAttributeOptionOrThrow = async (
  scope: MedusaContainer,
  id: string,
  withDeleted = false,
) => {
  const options = await getProductAttributeService(
    scope,
  ).listProductAttributeOptions({ id }, { take: 1, withDeleted })
  const option = options[0]

  if (!option) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product Attribute option "${id}" was not found.`,
    )
  }
  return option
}

export const getDefinitionUsageCountMap = async (
  scope: MedusaContainer,
  ids: string[],
) =>
  toUsageCountMap(
    await getProductAttributeService(scope).getActiveDefinitionUsageCounts(ids),
  )

export const getOptionUsageCountMap = async (
  scope: MedusaContainer,
  ids: string[],
) =>
  toUsageCountMap(
    await getProductAttributeService(scope).getActiveOptionUsageCounts(ids),
  )

const getAssignedProductOrder = (input = "title") => {
  const direction: "ASC" | "DESC" = input.startsWith("-") ? "DESC" : "ASC"
  const requestedField = input.replace(LEADING_DASH_REGEX, "")
  const field = ASSIGNED_PRODUCT_ORDER_FIELDS.has(requestedField)
    ? requestedField
    : "title"

  return { [field]: direction, id: "ASC" as const }
}

const listOptionAssignmentProductIds = async (
  scope: MedusaContainer,
  optionId: string,
) => {
  const service = getProductAttributeService(scope)
  const productIds = new Set<string>()
  let skip = 0

  while (true) {
    const assignments = await service.listProductAttributes(
      { option_id: optionId },
      {
        order: { id: "ASC" },
        select: ["id", "product_id"],
        skip,
        take: ASSIGNMENT_QUERY_BATCH_SIZE,
      },
    )

    for (const assignment of assignments) {
      productIds.add(assignment.product_id)
    }
    if (assignments.length < ASSIGNMENT_QUERY_BATCH_SIZE) {
      return [...productIds]
    }
    skip += assignments.length
  }
}

export const listProductAttributeOptionAssignedProducts = async ({
  limit,
  offset,
  optionId,
  order = "title",
  q,
  scope,
}: {
  limit: number
  offset: number
  optionId: string
  order?: string
  q?: string
  scope: MedusaContainer
}) => {
  const productIds = await listOptionAssignmentProductIds(scope, optionId)
  if (!productIds.length) {
    return { count: 0, products: [] }
  }

  const escapedQuery = q ? escapeProductAttributeLikePattern(q) : undefined
  const productService = scope.resolve<IProductModuleService>(Modules.PRODUCT)
  const [products, count] = await productService.listAndCountProducts(
    {
      id: { $in: productIds },
      ...(escapedQuery
        ? {
            $or: [
              { title: { $ilike: `%${escapedQuery}%` } },
              { handle: { $ilike: `%${escapedQuery}%` } },
            ],
          }
        : {}),
    },
    {
      order: getAssignedProductOrder(order),
      select: ["id", "title", "handle", "status", "updated_at"],
      skip: offset,
      take: limit,
    },
  )

  return {
    count,
    products: products.map((product) => ({
      handle: product.handle,
      id: product.id,
      status: product.status,
      title: product.title,
      updated_at: product.updated_at,
    })),
  }
}

export const toProductAttributeDefinitionResponse = (
  definition: ProductAttributeDefinitionRecord,
  usageCount: number,
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
  usageCount: number,
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

const toProductAttributeAssignmentResponse = (
  definition: ProductAttributeDefinitionRecord,
  assignment: ProductAttributeAssignmentRecord | undefined,
  selectedOption: ProductAttributeOptionRecord | null,
) => {
  if (
    !assignment ||
    (definition.input_type === "select" && selectedOption === null)
  ) {
    return null
  }

  return {
    id: assignment.id,
    option_id: selectedOption?.id ?? null,
    text_value:
      definition.input_type === "text" ? (assignment.text_value ?? null) : null,
  }
}

export const getProductAttributeDetail = async (
  scope: MedusaContainer,
  productId: string,
) => {
  const service = getProductAttributeService(scope)
  const [definitions, assignments] = await Promise.all([
    listAllProductAttributeRecords(
      async (skip, take) =>
        await service.listAndCountProductAttributeDefinitions(
          {},
          {
            order: { id: "ASC", label: "ASC" },
            skip,
            take,
            withDeleted: true,
          },
        ),
    ),
    listAllProductAttributeRecords(
      async (skip, take) =>
        await service.listAndCountProductAttributes(
          { product_id: productId },
          { order: { id: "ASC" }, skip, take },
        ),
    ),
  ])
  const selectedOptionIds = [
    ...new Set(
      assignments.flatMap((assignment) =>
        assignment.option_id ? [assignment.option_id] : [],
      ),
    ),
  ]
  const options = selectedOptionIds.length
    ? await service.listProductAttributeOptions(
        { id: { $in: selectedOptionIds } },
        {
          order: { id: "ASC", label: "ASC" },
          take: selectedOptionIds.length,
          withDeleted: true,
        },
      )
    : []
  const [definitionUsageCounts, optionUsageCounts] = await Promise.all([
    getDefinitionUsageCountMap(
      scope,
      definitions.map((definition) => definition.id),
    ),
    getOptionUsageCountMap(scope, selectedOptionIds),
  ])
  const assignmentByDefinitionId = new Map(
    assignments.map((assignment) => [assignment.definition_id, assignment]),
  )
  const optionById = new Map(options.map((option) => [option.id, option]))

  return definitions
    .filter(
      (definition) =>
        !definition.deleted_at || assignmentByDefinitionId.has(definition.id),
    )
    .map((definition) => {
      const assignment = assignmentByDefinitionId.get(definition.id)
      const selectedOption = assignment?.option_id
        ? (optionById.get(assignment.option_id) ?? null)
        : null

      return {
        assignment: toProductAttributeAssignmentResponse(
          definition,
          assignment,
          selectedOption,
        ),
        definition: toProductAttributeDefinitionResponse(
          definition,
          definitionUsageCounts.get(definition.id) ?? 0,
        ),
        selected_option: selectedOption
          ? toProductAttributeOptionResponse(
              selectedOption,
              optionUsageCounts.get(selectedOption.id) ?? 0,
            )
          : null,
      }
    })
}
