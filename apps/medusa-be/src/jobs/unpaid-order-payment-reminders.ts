import type { MedusaContainer } from "@medusajs/framework"
import type { ILockingModule, Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  fetchUnpaidOrders,
  formatTotal,
  getOrderDisplayId,
  getPaymentUrl,
  type PaymentReminderOrder,
} from "../utils/order-payment-reminders"
import { sendOrderPaymentReminderWorkflow } from "../workflows/send-order-payment-reminder"

const JOB_LOCK_KEY = "unpaid-order-payment-reminders-job"
const JOB_LOCK_TIMEOUT = 15 * 60
const MAX_ORDERS_PER_RUN = 500

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

async function executePaymentReminderJob(
  container: MedusaContainer,
  logger: Logger
) {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  logger.info("Unpaid Order Payment Reminders: Starting...")

  const unpaidOrders = await fetchUnpaidOrders(query, MAX_ORDERS_PER_RUN)
  if (!unpaidOrders.length) {
    logger.info("Unpaid Order Payment Reminders: No unpaid orders found")
    return
  }

  logger.info(
    `Unpaid Order Payment Reminders: Found ${unpaidOrders.length} unpaid orders`
  )

  let sentCount = 0
  for (const order of unpaidOrders) {
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
