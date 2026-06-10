import type { MedusaRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"

type AuthContext = {
  actor_id?: string
  actor_type?: string
}

type CustomerRecord = {
  first_name?: null | string
  id: string
  last_name?: null | string
}

type ProductRecord = {
  id: string
}

export type ReviewTokenDTO = {
  customer_id: string | null
  email: string
  expires_at?: Date | string | null
  id: string
  order_id: string
  product_id: string
  token: string
  used_at?: Date | string | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isCustomerRecord = (value: unknown): value is CustomerRecord =>
  isRecord(value) && typeof value.id === "string"

const isProductRecord = (value: unknown): value is ProductRecord =>
  isRecord(value) && typeof value.id === "string"

type ProductReviewModuleServiceWithTokens = ProductReviewModuleService & {
  listReviewTokens: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ReviewTokenDTO[]>
}

export const getCustomerId = (req: MedusaRequest) => {
  const authContext =
    "auth_context" in req
      ? (req.auth_context as AuthContext | undefined)
      : undefined

  if (authContext?.actor_type !== "customer" || !authContext.actor_id) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Product reviews require an authenticated customer."
    )
  }

  return authContext.actor_id
}

export const getReviewTokenCustomerId = (reviewToken: ReviewTokenDTO) =>
  reviewToken.customer_id ?? `review-token:${reviewToken.id}`

export const getReviewAuthorName = ({
  customer,
  reviewToken,
}: {
  customer?: CustomerRecord
  reviewToken?: ReviewTokenDTO
}) => ({
  first_name: reviewToken ? "Anonym" : customer?.first_name ?? null,
  last_name: reviewToken ? null : customer?.last_name ?? null,
})

export function assertReviewTokenUsable(
  reviewToken: ReviewTokenDTO | undefined,
  productId: string
) {
  if (!reviewToken) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Review token was not found."
    )
  }

  if (reviewToken.product_id !== productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review token does not match this product."
    )
  }

  if (reviewToken.used_at) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review token has already been used."
    )
  }

  if (reviewToken.expires_at) {
    const expiresAt = new Date(reviewToken.expires_at)
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Review token has expired."
      )
    }
  }
}

export async function retrieveReviewToken(
  req: MedusaRequest,
  token: string,
  productId: string
) {
  const reviewService = req.scope.resolve<ProductReviewModuleServiceWithTokens>(
    PRODUCT_REVIEW_MODULE
  )
  const [reviewToken] = await reviewService.listReviewTokens(
    {
      token,
    },
    {
      take: 1,
    }
  )

  assertReviewTokenUsable(reviewToken, productId)
  return reviewToken
}

export async function ensureReviewDoesNotExist({
  customerId,
  productId,
  req,
}: {
  customerId: string
  productId: string
  req: MedusaRequest
}) {
  const [existingReview] = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .listReviews(
      {
        customer_id: customerId,
        product_id: productId,
      },
      {
        take: 1,
      }
    )

  if (existingReview) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      "You have already reviewed this product."
    )
  }
}

export const retrieveCustomer = async (
  req: MedusaRequest,
  customerId: string
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "last_name"],
    filters: {
      id: customerId,
    },
  })

  return Array.isArray(data) && isCustomerRecord(data[0]) ? data[0] : undefined
}

export const ensureProductExists = async (
  req: MedusaRequest,
  productId: string
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  if (!(Array.isArray(data) && isProductRecord(data[0]))) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${productId}" was not found.`
    )
  }
}
