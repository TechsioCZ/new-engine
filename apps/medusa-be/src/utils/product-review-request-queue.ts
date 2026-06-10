import type { MedusaContainer } from "@medusajs/framework"
import type { Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { EMAIL_LOG_MODULE } from "../modules/email-log"
import type EmailLogModuleService from "../modules/email-log/service"
import { WORKFLOW_QUEUE_MODULE } from "../modules/workflow-queue"
import type WorkflowQueueModuleService from "../modules/workflow-queue/service"
import {
  getOrderDisplayId,
  getOrderPaidAt,
  getReviewRequestRunAt,
  isPaidOrder,
  type ReviewRequestOrder,
} from "./order-review-requests"
import { workflowQueueNames } from "./workflow-queue-registry"

const PRODUCT_REVIEW_REQUEST_TEMPLATE = "product-review-request"

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

type EmailLogDTO = {
  order_id: string | null
}

type EmailLogService = EmailLogModuleService & {
  listEmailLogs: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<EmailLogDTO[]>
}

type WorkflowQueueItemDTO = {
  arguments: Record<string, unknown> | null
  id: string
  workflow: string
}

type WorkflowQueueService = WorkflowQueueModuleService & {
  createWorkflowQueueItems: (data: {
    arguments: Record<string, unknown>
    run_at: Date
    workflow: string
  }) => Promise<WorkflowQueueItemDTO>
  listWorkflowQueueItems: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<WorkflowQueueItemDTO[]>
}

async function retrieveOrderForReviewRequest(
  container: MedusaContainer,
  orderId: string
) {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })

  return (data as ReviewRequestOrder[])[0]
}

async function hasReviewRequestEmailLog(
  container: MedusaContainer,
  orderId: string
) {
  const emailLogService = container.resolve<EmailLogService>(EMAIL_LOG_MODULE)
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

function isQueueItemForOrder(item: WorkflowQueueItemDTO, orderId: string) {
  return item.arguments?.order_id === orderId
}

async function hasQueuedReviewRequest(
  container: MedusaContainer,
  orderId: string
) {
  const workflowQueueService = container.resolve<WorkflowQueueService>(
    WORKFLOW_QUEUE_MODULE
  )
  const queuedItems = await workflowQueueService.listWorkflowQueueItems(
    {
      workflow: workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST,
    },
    {
      select: ["id", "arguments", "workflow"],
    }
  )

  return queuedItems.some((item) => isQueueItemForOrder(item, orderId))
}

export async function scheduleProductReviewRequestForOrder({
  container,
  logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER),
  orderId,
}: {
  container: MedusaContainer
  logger?: Logger
  orderId: string
}) {
  const order = await retrieveOrderForReviewRequest(container, orderId)

  if (!order) {
    logger.warn(`Skipping product review request queueing: order ${orderId} not found`)
    return null
  }

  if (!isPaidOrder(order)) {
    logger.info(
      `Skipping product review request queueing for order ${getOrderDisplayId(order)}: order is not paid`
    )
    return null
  }

  const [alreadySent, alreadyQueued] = await Promise.all([
    hasReviewRequestEmailLog(container, order.id),
    hasQueuedReviewRequest(container, order.id),
  ])

  if (alreadySent || alreadyQueued) {
    logger.info(
      `Skipping product review request queueing for order ${getOrderDisplayId(order)}: request already ${alreadySent ? "sent" : "queued"}`
    )
    return null
  }

  const paidAt = getOrderPaidAt(order)
  const runAt = getReviewRequestRunAt(order)

  if (!paidAt || !runAt) {
    logger.warn(
      `Skipping product review request queueing for order ${getOrderDisplayId(order)}: paid date could not be resolved`
    )
    return null
  }

  const workflowQueueService = container.resolve<WorkflowQueueService>(
    WORKFLOW_QUEUE_MODULE
  )

  const queueItem = await workflowQueueService.createWorkflowQueueItems({
    workflow: workflowQueueNames.SEND_PRODUCT_REVIEW_REQUEST,
    run_at: runAt,
    arguments: {
      order_id: order.id,
    },
  })

  logger.info(
    `Queued product review request ${queueItem.id} for order ${getOrderDisplayId(order)} at ${runAt.toISOString()} (paid at ${paidAt.toISOString()})`
  )

  return queueItem
}
