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

const LIKE_WILDCARD_REGEX = /[\\%_]/gu
const LEADING_DASH_REGEX = /^-/u
const ORDER_FIELDS = new Set(["key", "label", "created_at", "updated_at"])
const ASSIGNED_PRODUCT_ORDER_FIELDS = new Set([
  "handle",
  "status",
  "title",
  "updated_at",
])
const ASSIGNMENT_QUERY_BATCH_SIZE = 100
const PRODUCT_ATTRIBUTE_DETAIL_BATCH_SIZE = 100
const MAX_PRODUCT_ATTRIBUTE_QUERY_PAGES = 1000

export const listAllProductAttributeRecords = async <T>(
  listPage: (skip: number, take: number) => Promise<[T[], number]>,
) => {
  const loadPage = async (records: T[], pageCount: number): Promise<T[]> => {
    if (pageCount >= MAX_PRODUCT_ATTRIBUTE_QUERY_PAGES) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Product attribute query exceeded ${MAX_PRODUCT_ATTRIBUTE_QUERY_PAGES} pages`,
      )
    }

    const [page, total] = await listPage(
      records.length,
      PRODUCT_ATTRIBUTE_DETAIL_BATCH_SIZE,
    )
    const nextRecords = [...records, ...page]
    if (page.length === 0 || nextRecords.length >= total) {
      return nextRecords
    }

    return await loadPage(nextRecords, pageCount + 1)
  }

  return await loadPage([], 0)
}

export const escapeProductAttributeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

export const parseProductAttributeOrder = (value = "label") => {
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const requestedField = value.replace(LEADING_DASH_REGEX, "")
  const field = ORDER_FIELDS.has(requestedField) ? requestedField : "label"
  return { [field]: direction, id: "ASC" as const }
}

export const applyProductAttributeStatusFilter = <T extends object>(
  filters: T,
  status: ProductAttributeListStatus,
) => ({
  ...filters,
  ...(status === "active" ? { deleted_at: null } : {}),
  ...(status === "deleted" ? { deleted_at: { $ne: null } } : {}),
})

export const retrieveProductAttributeDefinitionOrThrow = async (
  scope: MedusaContainer,
  id: string,
  withDeleted = false,
) => {
  const definitions = await getProductAttributeService(
    scope,
  ).listProductAttributeDefinitions({ id }, { take: 1, withDeleted })
  const [definition] = definitions

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
  const [option] = options

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
  const direction = input.startsWith("-") ? "DESC" : "ASC"
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
  const loadPage = async (
    productIds: Set<string>,
    skip: number,
    pageCount: number,
  ): Promise<string[]> => {
    if (pageCount >= MAX_PRODUCT_ATTRIBUTE_QUERY_PAGES) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Product attribute assignment query exceeded ${MAX_PRODUCT_ATTRIBUTE_QUERY_PAGES} pages`,
      )
    }

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

    return await loadPage(productIds, skip + assignments.length, pageCount + 1)
  }

  return await loadPage(new Set(), 0, 0)
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

  const escapedQuery =
    typeof q === "string" && q.length > 0
      ? escapeProductAttributeLikePattern(q)
      : undefined
  const productService = scope.resolve<IProductModuleService>(Modules.PRODUCT)
  const [products, count] = await productService.listAndCountProducts(
    {
      id: { $in: productIds },
      ...(typeof escapedQuery === "string" && escapedQuery.length > 0
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
        typeof assignment.option_id === "string" &&
        assignment.option_id.length > 0
          ? [assignment.option_id]
          : [],
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

  return definitions.flatMap((definition) => {
    if (
      definition.deleted_at !== null &&
      definition.deleted_at !== undefined &&
      !assignmentByDefinitionId.has(definition.id)
    ) {
      return []
    }
    const assignment = assignmentByDefinitionId.get(definition.id)
    const selectedOptionId = assignment?.option_id
    const selectedOption =
      typeof selectedOptionId === "string" && selectedOptionId.length > 0
        ? (optionById.get(selectedOptionId) ?? null)
        : null

    return [
      {
        assignment: toProductAttributeAssignmentResponse(
          definition,
          assignment,
          selectedOption,
        ),
        definition: toProductAttributeDefinitionResponse(
          definition,
          definitionUsageCounts.get(definition.id) ?? 0,
        ),
        selected_option:
          selectedOption === null
            ? null
            : toProductAttributeOptionResponse(
                selectedOption,
                optionUsageCounts.get(selectedOption.id) ?? 0,
              ),
      },
    ]
  })
}
