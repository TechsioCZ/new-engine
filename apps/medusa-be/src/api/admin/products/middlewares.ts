import type { Query } from "@medusajs/framework"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  PRIMARY_CATEGORY_METADATA_KEY,
  PrimaryCategoryValidationError,
  validatePrimaryCategoryAssignment,
} from "./primary-category"

type ProductRecord = {
  categories?: Array<{ id?: string | null }> | null
  metadata?: Record<string, unknown> | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.hasOwn(value, key)

const resolveBodyCategoryIds = (
  body: Record<string, unknown>
): string[] | null => {
  if (hasOwn(body, "categories")) {
    const categories = body.categories
    if (!Array.isArray(categories)) {
      return []
    }

    return categories
      .map((category) => (isRecord(category) ? category.id : undefined))
      .filter(
        (categoryId): categoryId is string =>
          typeof categoryId === "string" && categoryId.length > 0
      )
  }

  if (hasOwn(body, "category_ids")) {
    const categoryIds = body.category_ids
    if (!Array.isArray(categoryIds)) {
      return []
    }

    return categoryIds.filter(
      (categoryId): categoryId is string =>
        typeof categoryId === "string" && categoryId.length > 0
    )
  }

  return null
}

const resolvePrimaryCategoryId = (
  body: Record<string, unknown>,
  currentProduct?: ProductRecord
): unknown => {
  if (hasOwn(body, "metadata")) {
    const metadata = body.metadata
    if (metadata === null) {
      return
    }
    if (isRecord(metadata) && hasOwn(metadata, PRIMARY_CATEGORY_METADATA_KEY)) {
      return metadata[PRIMARY_CATEGORY_METADATA_KEY]
    }
  }

  return currentProduct?.metadata?.[PRIMARY_CATEGORY_METADATA_KEY]
}

const resolveCurrentCategoryIds = (product?: ProductRecord): string[] =>
  (product?.categories ?? [])
    .map((category) => category.id)
    .filter((categoryId): categoryId is string => Boolean(categoryId))

const loadProduct = async (
  req: MedusaRequest,
  productId: string
): Promise<ProductRecord | undefined> => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["metadata", "categories.id"],
    filters: { id: productId },
  })

  return data[0] as ProductRecord | undefined
}

const resolveRequestBody = (req: MedusaRequest): Record<string, unknown> => {
  if (isRecord(req.validatedBody)) {
    return req.validatedBody
  }
  if (isRecord(req.body)) {
    return req.body
  }
  return {}
}

const validatePrimaryCategory = async (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const body = resolveRequestBody(req)
  const currentProduct = req.params.id
    ? await loadProduct(req, req.params.id)
    : undefined
  const bodyCategoryIds = resolveBodyCategoryIds(body)
  const categoryIds =
    bodyCategoryIds ?? resolveCurrentCategoryIds(currentProduct)
  const primaryCategoryId = resolvePrimaryCategoryId(body, currentProduct)

  try {
    validatePrimaryCategoryAssignment(primaryCategoryId, categoryIds)
  } catch (error) {
    if (error instanceof PrimaryCategoryValidationError) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
    }
    throw error
  }

  next()
}

/**
 * Server-side guard on Medusa's core admin create/update product routes. It
 * validates both primary-category edits and simultaneous category removals.
 */
export const adminProductPrimaryCategoryMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/admin/products",
    middlewares: [validatePrimaryCategory],
  },
  {
    methods: ["POST"],
    matcher: "/admin/products/:id",
    middlewares: [validatePrimaryCategory],
  },
]
