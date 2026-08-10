import { randomBytes } from "node:crypto"

import type {
  CreateNotificationDTO,
  Logger,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

import { EMAIL_LOG_MODULE } from "../modules/email-log"
import type EmailLogModuleService from "../modules/email-log/service"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import type ProductReviewModuleService from "../modules/product-review/service"
import {
  getOrderDisplayId,
  getStorefrontUrl,
} from "../utils/order-payment-reminders"
import {
  buildProductReviewRequestUrl,
  getReviewRequestMessage,
} from "../utils/order-review-requests"
import { sendNotificationStep } from "./steps/send-notification"
import { deleteWorkflowQueueItemStep } from "./workflow-queue/steps/delete-workflow-queue-item"

export interface SendProductReviewRequestWorkflowInput {
  order_id: string
  queue_item_id?: string
  store_name?: string
}

const optionalNullableStringSchema = z.string().nullable().optional()

const reviewRequestOrderItemSchema = z.object({
  product_handle: optionalNullableStringSchema,
  product_id: optionalNullableStringSchema,
  product_title: optionalNullableStringSchema,
  thumbnail: optionalNullableStringSchema,
  title: optionalNullableStringSchema,
})

const reviewRequestOrderProjectionSchema = z.object({
  custom_display_id: optionalNullableStringSchema,
  customer_id: optionalNullableStringSchema,
  display_id: z.number(),
  email: optionalNullableStringSchema,
  id: z.string().min(1),
  items: z.array(reviewRequestOrderItemSchema).nullable().optional(),
})

const reviewRequestOrderGraphResultSchema = z.object({
  data: z.array(reviewRequestOrderProjectionSchema),
})

type ReviewRequestOrderItem = z.infer<typeof reviewRequestOrderItemSchema>
type ReviewRequestOrderProjection = z.infer<
  typeof reviewRequestOrderProjectionSchema
>

const parseReviewRequestOrderGraphResult = (value: unknown) => {
  const result = reviewRequestOrderGraphResultSchema.safeParse(value)
  if (!result.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Order query returned invalid product review request data",
    )
  }

  return result.data.data
}

const getReviewRequestOrderDisplayId = (order: ReviewRequestOrderProjection) =>
  getOrderDisplayId({
    custom_display_id: order.custom_display_id ?? null,
    display_id: order.display_id,
  })

interface ReviewRequestProduct {
  image_url?: string | null
  product_id: string
  review_url: string
  title: string
  token: string
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const formatReviewProducts = (products: ReviewRequestProduct[]) =>
  products
    .map((product) => `${product.title}: ${product.review_url}`)
    .join("\n")

const formatReviewItems = (products: ReviewRequestProduct[]) =>
  products
    .map((product) => {
      const image =
        product.image_url !== undefined &&
        product.image_url !== null &&
        product.image_url !== ""
          ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.title)}" width="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:8px;" />`
          : ""

      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;border-collapse:collapse;"><tr><td width="84" valign="top">${image}</td><td valign="top" style="font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#111827;"><div style="font-weight:600;margin-bottom:10px;">${escapeHtml(product.title)}</div><a href="${escapeHtml(product.review_url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-weight:600;">Napiš recenzi produktu</a></td></tr></table>`
    })
    .join("")

const ORDER_REVIEW_REQUEST_FIELDS = [
  "id",
  "customer_id",
  "custom_display_id",
  "display_id",
  "email",
  "items.product_handle",
  "items.product_id",
  "items.product_title",
  "items.thumbnail",
  "items.title",
]

const PRODUCT_REVIEW_REQUEST_TEMPLATE = "product-review-request"
const DEFAULT_REVIEW_TOKEN_EXPIRY_DAYS = 90
const DAY_IN_MS = 24 * 60 * 60 * 1000

const createToken = () => randomBytes(32).toString("base64url")

const getReviewTokenExpiryDate = () => {
  const configuredDays = Number(process.env["PRODUCT_REVIEW_TOKEN_EXPIRY_DAYS"])
  const expiryDays =
    Number.isFinite(configuredDays) && configuredDays > 0
      ? configuredDays
      : DEFAULT_REVIEW_TOKEN_EXPIRY_DAYS

  return new Date(Date.now() + expiryDays * DAY_IN_MS)
}

const getProductTitle = (item: ReviewRequestOrderItem) =>
  item.product_title ?? item.title ?? "Produkt"

const getUniqueProductItems = (order: ReviewRequestOrderProjection) => {
  const items: ReviewRequestOrderItem[] = []
  const seenProductIds = new Set<string>()

  for (const item of order.items ?? []) {
    if (
      item.product_id === undefined ||
      item.product_id === null ||
      item.product_id === "" ||
      seenProductIds.has(item.product_id)
    ) {
      continue
    }

    seenProductIds.add(item.product_id)
    items.push(item)
  }

  return items
}

const hasReviewRequestEmailLog = async ({
  emailLogService,
  orderId,
}: {
  emailLogService: EmailLogModuleService
  orderId: string
}) => {
  const logs = await emailLogService.listEmailLogs(
    {
      order_id: orderId,
      type: PRODUCT_REVIEW_REQUEST_TEMPLATE,
    },
    {
      select: ["order_id"],
      take: 1,
    },
  )

  return logs.length > 0
}

const getOrCreateReviewTokens = async ({
  email,
  items,
  order,
  reviewService,
}: {
  email: string
  items: ReviewRequestOrderItem[]
  order: ReviewRequestOrderProjection
  reviewService: ProductReviewModuleService
}) => {
  const productIds = items
    .map((item) => item.product_id)
    .filter(
      (productId): productId is string =>
        productId !== undefined && productId !== null && productId !== "",
    )

  const existingTokens = await reviewService.listReviewTokens(
    {
      email,
      order_id: order.id,
      product_id: { $in: productIds },
    },
    {
      select: ["id", "email", "order_id", "product_id", "token"],
    },
  )
  const tokensByProductId = new Map<string, (typeof existingTokens)[number]>()
  for (const token of existingTokens) {
    tokensByProductId.set(token.product_id, token)
  }
  const missingProductIds = productIds.filter(
    (productId) => !tokensByProductId.has(productId),
  )

  if (missingProductIds.length > 0) {
    const expiresAt = getReviewTokenExpiryDate()
    const createdTokens = await reviewService.createReviewTokens(
      missingProductIds.map((productId) => ({
        customer_id: order.customer_id ?? null,
        email,
        expires_at: expiresAt,
        order_id: order.id,
        product_id: productId,
        token: createToken(),
      })),
    )

    for (const token of createdTokens) {
      tokensByProductId.set(token.product_id, token)
    }
  }

  return tokensByProductId
}

const buildProductReviewRequestNotificationStep = createStep(
  "build-product-review-request-notification",
  async (
    input: SendProductReviewRequestWorkflowInput,
    { container },
  ): Promise<StepResponse<CreateNotificationDTO[]>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const emailLogService =
      container.resolve<EmailLogModuleService>(EMAIL_LOG_MODULE)
    const reviewService = container.resolve<ProductReviewModuleService>(
      PRODUCT_REVIEW_MODULE,
    )

    const graphResult: unknown = await query.graph({
      entity: "order",
      fields: ORDER_REVIEW_REQUEST_FIELDS,
      filters: {
        id: input.order_id,
      },
    })
    const [order] = parseReviewRequestOrderGraphResult(graphResult)
    if (order === undefined) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    if (
      order.email === undefined ||
      order.email === null ||
      order.email === ""
    ) {
      logger.warn(
        `Order ${order.id} has no email; product review request skipped.`,
      )
      return new StepResponse([])
    }

    if (
      await hasReviewRequestEmailLog({
        emailLogService,
        orderId: order.id,
      })
    ) {
      logger.info(
        `Order ${getReviewRequestOrderDisplayId(order)} already has a product review request email log; skipping notification.`,
      )
      return new StepResponse([])
    }

    const items = getUniqueProductItems(order)
    if (items.length === 0) {
      logger.warn(
        `Order ${order.id} has no product items; product review request skipped.`,
      )
      return new StepResponse([])
    }

    const tokensByProductId = await getOrCreateReviewTokens({
      email: order.email,
      items,
      order,
      reviewService,
    })
    const products = items.flatMap<ReviewRequestProduct>((item) => {
      if (
        item.product_id === undefined ||
        item.product_id === null ||
        item.product_id === ""
      ) {
        return []
      }

      const token = tokensByProductId.get(item.product_id)?.token
      if (token === undefined || token === "") {
        return []
      }

      return [
        {
          image_url: item.thumbnail ?? null,
          product_id: item.product_id,
          review_url: buildProductReviewRequestUrl({
            productId: item.product_id,
            storefrontUrl: getStorefrontUrl(),
            token,
          }),
          title: getProductTitle(item),
          token,
        },
      ]
    })
    const message = await getReviewRequestMessage(container)

    return new StepResponse([
      {
        channel: "email",
        data: {
          items: formatReviewItems(products),
          message,
          order_display_id: getReviewRequestOrderDisplayId(order),
          order_id: order.id,
          product_reviews: products,
          products: formatReviewProducts(products),
          ...(input.store_name === undefined
            ? {}
            : { store_name: input.store_name }),
        },
        ...(order.customer_id === undefined ||
        order.customer_id === null ||
        order.customer_id === ""
          ? {}
          : { receiver_id: order.customer_id }),
        resource_id: order.id,
        resource_type: "order",
        template: PRODUCT_REVIEW_REQUEST_TEMPLATE,
        to: order.email,
        trigger_type: "order.product_review_request",
      },
    ])
  },
)

export const sendProductReviewRequestWorkflow = createWorkflow(
  "send-product-review-request",
  (input: SendProductReviewRequestWorkflowInput) => {
    const notificationInput = buildProductReviewRequestNotificationStep(input)
    const notification = sendNotificationStep(notificationInput)
    const deletedQueueItem = deleteWorkflowQueueItemStep(input)

    return new WorkflowResponse({
      deletedQueueItem,
      notification,
    })
  },
)
