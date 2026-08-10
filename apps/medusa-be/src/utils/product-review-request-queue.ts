import type { MedusaContainer } from "@medusajs/framework"
import type { Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { EMAIL_LOG_MODULE } from "../modules/email-log"
import type EmailLogModuleService from "../modules/email-log/service"
import { WORKFLOW_QUEUE_MODULE } from "../modules/workflow-queue"
import type WorkflowQueueModuleService from "../modules/workflow-queue/service"
import { getOrderDisplayId } from "./order-payment-reminders"
import {
  getOrderPaidAt,
  getReviewRequestRunAt,
  isPaidOrder,
} from "./order-review-requests"
import { workflowQueueNames } from "./workflow-queue-registry"

const PRODUCT_REVIEW_REQUEST_TEMPLATE = "product-review-request"
const PRODUCT_REVIEW_REQUEST_DEDUPE_KEY_PREFIX = "send-review-reminder"

const ORDER_FIELDS = [
  "id",
  "customer_id",
  "custom_display_id",
  "display_id",
  "email",
  "payment_status",
  "payment_collections.completed_at",
  "payment_collections.payments.captured_at",
  "payment_collections.status",
  "payment_collections.updated_at",
  "status",
]

const getProductReviewRequestDedupeKey = (orderId: string) =>
  `${PRODUCT_REVIEW_REQUEST_DEDUPE_KEY_PREFIX}-${orderId}`

const retrieveOrderForReviewRequest = async (
  container: MedusaContainer,
  orderId: string,
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })

  return data[0]
}

const hasReviewRequestEmailLog = async (
  container: MedusaContainer,
  orderId: string,
) => {
  const emailLogService =
    container.resolve<EmailLogModuleService>(EMAIL_LOG_MODULE)
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

const hasQueuedReviewRequest = async (
  container: MedusaContainer,
  dedupeKey: string,
) => {
  const workflowQueueService = container.resolve<WorkflowQueueModuleService>(
    WORKFLOW_QUEUE_MODULE,
  )
  const items = await workflowQueueService.listWorkflowQueueItems(
    {
      dedupe_key: dedupeKey,
      workflow: workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST,
    },
    {
      select: ["id"],
      take: 1,
    },
  )

  return items.length > 0
}

export const scheduleProductReviewRequestForOrder = async ({
  container,
  logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER),
  orderId,
}: {
  container: MedusaContainer
  logger?: Logger
  orderId: string
}) => {
  const order = await retrieveOrderForReviewRequest(container, orderId)

  if (order === undefined) {
    logger.warn(
      `Skipping product review request queueing: order ${orderId} not found`,
    )
    return null
  }

  if (!isPaidOrder(order)) {
    logger.info(
      `Skipping product review request queueing for order ${getOrderDisplayId(order)}: order is not paid`,
    )
    return null
  }

  const dedupeKey = getProductReviewRequestDedupeKey(order.id)
  const [alreadySent, alreadyQueued] = await Promise.all([
    hasReviewRequestEmailLog(container, order.id),
    hasQueuedReviewRequest(container, dedupeKey),
  ])

  if (alreadySent || alreadyQueued) {
    logger.info(
      `Skipping product review request queueing for order ${getOrderDisplayId(order)}: request already ${alreadySent ? "sent" : "queued"}`,
    )
    return null
  }

  const paidAt = getOrderPaidAt(order)
  const runAt = getReviewRequestRunAt(order)

  if (paidAt === undefined || runAt === undefined) {
    logger.warn(
      `Skipping product review request queueing for order ${getOrderDisplayId(order)}: paid date could not be resolved`,
    )
    return null
  }

  const workflowQueueService = container.resolve<WorkflowQueueModuleService>(
    WORKFLOW_QUEUE_MODULE,
  )

  const queueItem = await workflowQueueService.createWorkflowQueueItems({
    arguments: {
      order_id: order.id,
    },
    dedupe_key: dedupeKey,
    run_at: runAt,
    workflow: workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST,
  })

  logger.info(
    `Queued product review request ${queueItem.id} for order ${getOrderDisplayId(order)} at ${runAt.toISOString()} (paid at ${paidAt.toISOString()})`,
  )

  return queueItem
}
