import type { MedusaRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import type ProductReviewModuleService from "../../../modules/product-review/service"

interface CustomerRecord {
  first_name?: null | string | undefined
  id: string
  last_name?: null | string | undefined
}

type PaymentTimestamp = Date | string | null

interface PaymentRecord {
  captured_at?: PaymentTimestamp | undefined
}

type NullableCapturedAmount = number | string | null

interface PaymentCollectionRecord {
  captured_amount?: NullableCapturedAmount | undefined
  payments?: PaymentRecord[] | null | undefined
  status?: string | null | undefined
}

interface OrderRecord {
  id: string
  items?: { product_id?: string | null | undefined }[] | null | undefined
  payment_collections?: PaymentCollectionRecord[] | null | undefined
}

const CustomerRecordSchema = z.object({
  first_name: z.string().nullable().optional(),
  id: z.string(),
  last_name: z.string().nullable().optional(),
})

const OrderRecordSchema = z.object({
  id: z.string(),
  items: z
    .array(z.object({ product_id: z.string().nullable().optional() }))
    .nullable()
    .optional(),
  payment_collections: z
    .array(
      z.object({
        captured_amount: z
          .union([z.number(), z.string()])
          .nullable()
          .optional(),
        payments: z
          .array(
            z.object({
              captured_at: z
                .union([z.date(), z.string()])
                .nullable()
                .optional(),
            }),
          )
          .nullable()
          .optional(),
        status: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
})

export interface ReviewTokenDTO {
  customer_id: string | null
  email: string
  expires_at?: Date | string | null
  id: string
  order_id: string
  product_id: string
  token: string
  used_at?: Date | string | null
}

const isReviewAuthContextObjectLike = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isPaymentCaptured = (payment: PaymentRecord) =>
  payment.captured_at !== null && payment.captured_at !== undefined

const isPaymentCollectionPaid = (collection: PaymentCollectionRecord) =>
  collection.status === "completed" ||
  Number(collection.captured_amount ?? 0) > 0 ||
  collection.payments?.some(isPaymentCaptured) === true

const isOrderPaid = (order: OrderRecord) =>
  order.payment_collections?.some(isPaymentCollectionPaid) === true

type ProductReviewModuleServiceWithTokens = ProductReviewModuleService & {
  listReviewTokens: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<ReviewTokenDTO[]>
}

export const getAuthenticatedCustomerId = (req: MedusaRequest) => {
  const authContext = "auth_context" in req ? req.auth_context : undefined

  if (!isReviewAuthContextObjectLike(authContext)) {
    return null
  }

  return authContext["actor_type"] === "customer" &&
    typeof authContext["actor_id"] === "string"
    ? authContext["actor_id"]
    : null
}

export const getReviewTokenCustomerId = (reviewToken: ReviewTokenDTO) =>
  reviewToken.customer_id ?? `review-token:${reviewToken.id}`

export const getReviewAuthorName = ({
  customer,
  isGuest = false,
  reviewToken,
}: {
  customer?: CustomerRecord
  isGuest?: boolean
  reviewToken?: ReviewTokenDTO
}) => ({
  first_name:
    reviewToken !== undefined || isGuest
      ? "Anonym"
      : (customer?.first_name ?? null),
  last_name:
    reviewToken !== undefined || isGuest ? null : (customer?.last_name ?? null),
})

export const assertReviewTokenUsable = (
  reviewToken: ReviewTokenDTO | undefined,
  productId: string,
) => {
  if (reviewToken === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Review token was not found.",
    )
  }

  if (reviewToken.product_id !== productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Review token does not match this product.",
    )
  }

  if (reviewToken.used_at !== null && reviewToken.used_at !== undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Review token has already been used.",
    )
  }

  if (reviewToken.expires_at !== null && reviewToken.expires_at !== undefined) {
    const expiresAt = new Date(reviewToken.expires_at)
    if (
      !Number.isNaN(expiresAt.getTime()) &&
      expiresAt.getTime() < Date.now()
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Review token has expired.",
      )
    }
  }
}

export const retrieveReviewToken = async (
  req: MedusaRequest,
  token: string,
  productId: string,
) => {
  const reviewService = req.scope.resolve<ProductReviewModuleServiceWithTokens>(
    PRODUCT_REVIEW_MODULE,
  )
  const [reviewToken] = await reviewService.listReviewTokens(
    {
      token,
    },
    {
      take: 1,
    },
  )

  assertReviewTokenUsable(reviewToken, productId)
  return reviewToken
}

export const ensureReviewDoesNotExist = async ({
  customerId,
  productId,
  req,
}: {
  customerId: string
  productId: string
  req: MedusaRequest
}) => {
  const [existingReview] = await req.scope
    .resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)
    .listReviews(
      {
        customer_id: customerId,
        product_id: productId,
      },
      {
        take: 1,
      },
    )

  if (existingReview !== undefined) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      "You have already reviewed this product.",
    )
  }
}

export const retrieveCustomer = async (
  req: MedusaRequest,
  customerId: string,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "last_name"],
    filters: {
      id: customerId,
    },
  })

  const [customer] = z.array(CustomerRecordSchema).parse(data)
  return customer
}

export const ensureProductExists = async (
  req: MedusaRequest,
  productId: string,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      id: productId,
    },
  })

  if (data.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${productId}" was not found.`,
    )
  }
}

export const ensureCustomerPurchasedProduct = async (
  req: MedusaRequest,
  customerId: string,
  productId: string,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "items.product_id",
      "payment_collections.status",
      "payment_collections.captured_amount",
      "payment_collections.payments.captured_at",
    ],
    filters: {
      customer_id: customerId,
    },
  })

  const orders = z.array(OrderRecordSchema).parse(data)
  const customerPurchasedProduct = orders.some(
    (order) =>
      order.items?.some((item) => item.product_id === productId) === true &&
      isOrderPaid(order),
  )

  if (!customerPurchasedProduct) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You can only review products you have purchased.",
    )
  }
}
