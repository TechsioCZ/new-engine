import { randomBytes } from "node:crypto"
import type { CreateNotificationDTO, Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { EMAIL_LOG_MODULE } from "../modules/email-log"
import type EmailLogModuleService from "../modules/email-log/service"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import type ProductReviewModuleService from "../modules/product-review/service"
import {
  getOrderDisplayId,
  getReviewRequestMessage,
  type ReviewRequestOrder,
} from "../utils/order-review-requests"
import { getStorefrontUrl } from "../utils/order-payment-reminders"
import { sendNotificationStep } from "./steps/send-notification"
import { deleteWorkflowQueueItemStep } from "./workflow-queue/steps/delete-workflow-queue-item"

export type SendProductReviewRequestWorkflowInput = {
  order_id: string
  queue_item_id?: string
  store_name?: string
}

type ReviewRequestOrderItem = {
  product_handle?: string | null
  product_id?: string | null
  product_title?: string | null
  thumbnail?: string | null
  title?: string | null
}

type ReviewRequestOrderWithItems = ReviewRequestOrder & {
  items?: ReviewRequestOrderItem[] | null
}

type EmailLogDTO = {
  order_id: string | null
}

type EmailLogService = EmailLogModuleService & {
  listEmailLogs: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<EmailLogDTO[]>
}

type ReviewTokenDTO = {
  email: string
  id: string
  order_id: string
  product_id: string
  token: string
}

type ProductReviewModuleServiceWithTokens = ProductReviewModuleService & {
  createReviewTokens: (
    data: Array<{
      customer_id: string | null
      email: string
      expires_at: Date
      order_id: string
      product_id: string
      token: string
    }>
  ) => Promise<ReviewTokenDTO[]>
  listReviewTokens: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ReviewTokenDTO[]>
}

type ReviewRequestProduct = {
  image_url?: string | null
  product_id: string
  review_url: string
  title: string
  token: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatReviewProducts(products: ReviewRequestProduct[]) {
  return products
    .map((product) => `${product.title}: ${product.review_url}`)
    .join("\n")
}

function formatReviewItems(products: ReviewRequestProduct[]) {
  return products
    .map((product) => {
      const image = product.image_url
        ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.title)}" width="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:8px;" />`
        : ""

      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;border-collapse:collapse;"><tr><td width="84" valign="top">${image}</td><td valign="top" style="font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#111827;"><div style="font-weight:600;margin-bottom:10px;">${escapeHtml(product.title)}</div><a href="${escapeHtml(product.review_url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-weight:600;">Napiš recenzi produktu</a></td></tr></table>`
    })
    .join("")
}

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
const DEFAULT_PRODUCT_REVIEW_REQUEST_PATH = "/reviews/product"
const DEFAULT_REVIEW_TOKEN_EXPIRY_DAYS = 90
const DAY_IN_MS = 24 * 60 * 60 * 1000
const LEADING_SLASH_REGEX = /^\/+/
const TRAILING_SLASH_REGEX = /\/$/

function createToken() {
  return randomBytes(32).toString("base64url")
}

function getReviewTokenExpiryDate() {
  const configuredDays = Number(process.env.PRODUCT_REVIEW_TOKEN_EXPIRY_DAYS)
  const expiryDays =
    Number.isFinite(configuredDays) && configuredDays > 0
      ? configuredDays
      : DEFAULT_REVIEW_TOKEN_EXPIRY_DAYS

  return new Date(Date.now() + expiryDays * DAY_IN_MS)
}

function getProductTitle(item: ReviewRequestOrderItem) {
  return item.product_title ?? item.title ?? "Produkt"
}

function getProductReviewRequestPath() {
  return (
    process.env.PRODUCT_REVIEW_REQUEST_PATH ?? DEFAULT_PRODUCT_REVIEW_REQUEST_PATH
  ).replace(LEADING_SLASH_REGEX, "")
}

function getReviewUrl(token: string) {
  const storefrontUrl = getStorefrontUrl().replace(TRAILING_SLASH_REGEX, "")
  const reviewPath = getProductReviewRequestPath().replace(
    TRAILING_SLASH_REGEX,
    ""
  )

  return `${storefrontUrl}/${reviewPath}/${token}`
}

function isReviewRequestOrderWithItems(
  value: unknown
): value is ReviewRequestOrderWithItems {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const record = value as Record<string, unknown>

  return typeof record.id === "string" && typeof record.display_id === "number"
}

function getUniqueProductItems(order: ReviewRequestOrderWithItems) {
  const items: ReviewRequestOrderItem[] = []
  const seenProductIds = new Set<string>()

  for (const item of order.items ?? []) {
    if (!item.product_id || seenProductIds.has(item.product_id)) {
      continue
    }

    seenProductIds.add(item.product_id)
    items.push(item)
  }

  return items
}

async function hasReviewRequestEmailLog({
  emailLogService,
  orderId,
}: {
  emailLogService: EmailLogService
  orderId: string
}) {
  const logs = await emailLogService.listEmailLogs(
    {
      order_id: orderId,
      type: PRODUCT_REVIEW_REQUEST_TEMPLATE,
    },
    {
      select: ["order_id"],
      take: 1,
    }
  )

  return logs.length > 0
}

async function getOrCreateReviewTokens({
  email,
  items,
  order,
  reviewService,
}: {
  email: string
  items: ReviewRequestOrderItem[]
  order: ReviewRequestOrderWithItems
  reviewService: ProductReviewModuleServiceWithTokens
}) {
  const productIds = items
    .map((item) => item.product_id)
    .filter((productId): productId is string => Boolean(productId))

  const existingTokens = await reviewService.listReviewTokens(
    {
      email,
      order_id: order.id,
      product_id: { $in: productIds },
    },
    {
      select: ["id", "email", "order_id", "product_id", "token"],
    }
  )
  const tokensByProductId = new Map<string, ReviewTokenDTO>(
    existingTokens.map((token) => [token.product_id, token])
  )
  const missingProductIds = productIds.filter(
    (productId) => !tokensByProductId.has(productId)
  )

  if (missingProductIds.length) {
    const expiresAt = getReviewTokenExpiryDate()
    const createdTokens = await reviewService.createReviewTokens(
      missingProductIds.map((productId) => ({
        customer_id: order.customer_id ?? null,
        email,
        expires_at: expiresAt,
        order_id: order.id,
        product_id: productId,
        token: createToken(),
      }))
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
    { container }
  ): Promise<StepResponse<CreateNotificationDTO[]>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const emailLogService = container.resolve<EmailLogService>(EMAIL_LOG_MODULE)
    const reviewService = container.resolve<ProductReviewModuleServiceWithTokens>(
      PRODUCT_REVIEW_MODULE
    )

    const { data } = await query.graph({
      entity: "order",
      fields: ORDER_REVIEW_REQUEST_FIELDS,
      filters: {
        id: input.order_id,
      },
    })
    if (!Array.isArray(data) || !isReviewRequestOrderWithItems(data[0])) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    const order = data[0]

    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    if (!order.email) {
      logger.warn(
        `Order ${order.id} has no email; product review request skipped.`
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
        `Order ${getOrderDisplayId(order)} already has a product review request email log; skipping notification.`
      )
      return new StepResponse([])
    }

    const items = getUniqueProductItems(order)
    if (!items.length) {
      logger.warn(
        `Order ${order.id} has no product items; product review request skipped.`
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
      if (!item.product_id) {
        return []
      }

      const token = tokensByProductId.get(item.product_id)?.token
      if (!token) {
        return []
      }

      return [
        {
          image_url: item.thumbnail ?? null,
          product_id: item.product_id,
          review_url: getReviewUrl(token),
          title: getProductTitle(item),
          token,
        },
      ]
    })
    const message = getReviewRequestMessage()

    return new StepResponse([
      {
        channel: "email",
        data: {
          message,
          order_display_id: getOrderDisplayId(order),
          items: formatReviewItems(products),
          order_id: order.id,
          product_reviews: products,
          products: formatReviewProducts(products),
          store_name: input.store_name,
        },
        receiver_id: order.customer_id ?? undefined,
        resource_id: order.id,
        resource_type: "order",
        template: PRODUCT_REVIEW_REQUEST_TEMPLATE,
        to: order.email,
        trigger_type: "order.product_review_request",
      },
    ])
  }
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
  }
)
