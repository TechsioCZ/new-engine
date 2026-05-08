import type { MedusaContainer } from "@medusajs/framework"
import type { ILockingModule, Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { EMAIL_LOG_MODULE } from "../modules/email-log"
import type EmailLogModuleService from "../modules/email-log/service"
import {
  fetchUnpaidOrders,
  formatTotal,
  getOrderDisplayId,
  getPaymentUrl,
  isPaymentReminderReadyOrder,
  type PaymentReminderOrder,
} from "../utils/order-payment-reminders"
import { sendOrderPaymentReminderWorkflow } from "../workflows/send-order-payment-reminder"

const JOB_LOCK_KEY = "unpaid-order-payment-reminders-job"
const JOB_LOCK_TIMEOUT = 15 * 60
const MAX_ORDERS_PER_RUN = 500
const EMAIL_LOG_LOOKUP_BATCH_SIZE = 500
const PAYMENT_REMINDER_TEMPLATE = "order-payment-reminder"

type EmailLogDTO = {
  order_id: string | null
}

type EmailLogService = EmailLogModuleService & {
  listEmailLogs: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<EmailLogDTO[]>
}

async function sendReminder(
  container: MedusaContainer,
  order: PaymentReminderOrder
) {
  if (!order.email) {
    return
  }

  await sendOrderPaymentReminderWorkflow(container).run({
    input: {
      customer_id: order.customer_id ?? undefined,
      email: order.email,
      order_display_id: getOrderDisplayId(order),
      order_id: order.id,
      payment_url: getPaymentUrl(order),
      store_name: process.env.STORE_NAME,
      total: formatTotal(order),
    },
  })
}

async function getAlreadyRemindedOrderIds(
  container: MedusaContainer,
  orders: PaymentReminderOrder[]
) {
  const orderIds = Array.from(new Set(orders.map((order) => order.id)))
  if (!orderIds.length) {
    return new Set<string>()
  }

  const emailLogService = container.resolve<EmailLogService>(EMAIL_LOG_MODULE)
  const alreadyRemindedOrderIds = new Set<string>()

  for (
    let index = 0;
    index < orderIds.length;
    index += EMAIL_LOG_LOOKUP_BATCH_SIZE
  ) {
    const orderIdChunk = orderIds.slice(
      index,
      index + EMAIL_LOG_LOOKUP_BATCH_SIZE
    )
    const alreadySentLogs = await emailLogService.listEmailLogs(
      {
        order_id: { $in: orderIdChunk },
        type: PAYMENT_REMINDER_TEMPLATE,
      },
      {
        select: ["order_id"],
      }
    )

    for (const log of alreadySentLogs) {
      if (log.order_id) {
        alreadyRemindedOrderIds.add(log.order_id)
      }
    }
  }

  return alreadyRemindedOrderIds
}

async function executePaymentReminderJob(
  container: MedusaContainer,
  logger: Logger
) {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  logger.info("Unpaid Order Payment Reminders: Starting...")

  const unpaidOrders = await fetchUnpaidOrders(query, MAX_ORDERS_PER_RUN)
  const readyOrders = unpaidOrders.filter((order) =>
    isPaymentReminderReadyOrder(order)
  )

  if (!readyOrders.length) {
    logger.info(
      "Unpaid Order Payment Reminders: No unpaid orders older than 24 hours found"
    )
    return
  }

  logger.info(
    `Unpaid Order Payment Reminders: Found ${readyOrders.length} unpaid orders older than 24 hours`
  )

  const alreadyRemindedOrderIds = await getAlreadyRemindedOrderIds(
    container,
    readyOrders
  )
  const ordersToRemind = readyOrders.filter(
    (order) => !alreadyRemindedOrderIds.has(order.id)
  )

  if (!ordersToRemind.length) {
    logger.info(
      "Unpaid Order Payment Reminders: All matching orders already have a reminder email log"
    )
    return
  }

  logger.info(
    `Unpaid Order Payment Reminders: Sending ${ordersToRemind.length} reminders, skipping ${alreadyRemindedOrderIds.size} already sent`
  )

  let sentCount = 0
  for (const order of ordersToRemind) {
    try {
      await sendReminder(container, order)
      sentCount += 1
    } catch (error) {
      logger.error(
        `Unpaid Order Payment Reminders: Failed to send reminder for order ${order.id}`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  logger.info(
    `Unpaid Order Payment Reminders: Completed, sent ${sentCount} reminders`
  )
}

export default async function unpaidOrderPaymentRemindersJob(
  container: MedusaContainer
) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  try {
    await lockingModule.execute(
      JOB_LOCK_KEY,
      async () => {
        await executePaymentReminderJob(container, logger)
      },
      { timeout: JOB_LOCK_TIMEOUT }
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Timed-out acquiring lock")
    ) {
      logger.info(
        "Unpaid Order Payment Reminders: Skipping - another instance is already running"
      )
      return
    }

    throw error
  }
}

export const config = {
  name: "unpaid-order-payment-reminders",
  schedule: "0 * * * *",
}
