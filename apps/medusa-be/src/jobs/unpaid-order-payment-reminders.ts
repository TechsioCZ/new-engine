import type { MedusaContainer } from "@medusajs/framework"
import type { ILockingModule, Logger, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { chunk, unique } from "@techsio/std/array"
import { getRecordValue, isRecord } from "@techsio/std/object"

import { EMAIL_LOG_MODULE } from "../modules/email-log"
import type EmailLogModuleService from "../modules/email-log/service"
import { executeWithLockTimeout } from "../utils/locking"
import {
  fetchUnpaidOrders,
  formatTotal,
  getOrderDisplayId,
  getPaymentUrl,
  isPaymentReminderReadyOrder,
} from "../utils/order-payment-reminders"
import type { PaymentReminderOrder } from "../utils/order-payment-reminders"
import { getMedusaStoreName } from "../utils/store-name"
import { sendOrderPaymentReminderWorkflow } from "../workflows/send-order-payment-reminder"

const JOB_LOCK_KEY = "unpaid-order-payment-reminders-job"
const JOB_LOCK_TIMEOUT = 15 * 60
const MAX_ORDERS_PER_RUN = 500
const EMAIL_LOG_LOOKUP_BATCH_SIZE = 500
const PAYMENT_REMINDER_TEMPLATE = "order-payment-reminder"

type EmailLogService = EmailLogModuleService & {
  listEmailLogs: (
    filters?: Parameters<EmailLogModuleService["listEmailLogs"]>[0],
    config?: Parameters<EmailLogModuleService["listEmailLogs"]>[1],
  ) => Promise<unknown>
}

const sendReminder = async (
  container: MedusaContainer,
  order: PaymentReminderOrder,
): Promise<void> => {
  if (order.email === undefined || order.email === null || order.email === "") {
    return
  }

  const customerId = order.customer_id ?? undefined
  const total = formatTotal(order)

  await sendOrderPaymentReminderWorkflow(container).run({
    input: {
      ...(customerId === undefined ? {} : { customer_id: customerId }),
      email: order.email,
      order_display_id: getOrderDisplayId(order),
      order_id: order.id,
      payment_url: getPaymentUrl(order),
      store_name: await getMedusaStoreName(container),
      ...(total === undefined ? {} : { total }),
    },
  })
}

const collectAlreadyRemindedOrderIds = async (
  emailLogService: EmailLogService,
  orderIdChunks: string[][],
  chunkIndex: number,
  alreadyRemindedOrderIds: Set<string>,
): Promise<void> => {
  const orderIdChunk = orderIdChunks[chunkIndex]
  if (orderIdChunk === undefined) {
    return
  }

  const alreadySentLogsResult = z.array(z.unknown()).safeParse(
    await emailLogService.listEmailLogs(
      {
        order_id: { $in: orderIdChunk },
        type: PAYMENT_REMINDER_TEMPLATE,
      },
      {
        select: ["order_id"],
      },
    ),
  )
  if (!alreadySentLogsResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email log lookup returned invalid data",
    )
  }

  for (const log of alreadySentLogsResult.data) {
    if (isRecord(log)) {
      const orderId = getRecordValue(log, "order_id")
      if (typeof orderId === "string" && orderId !== "") {
        alreadyRemindedOrderIds.add(orderId)
      }
    }
  }

  await collectAlreadyRemindedOrderIds(
    emailLogService,
    orderIdChunks,
    chunkIndex + 1,
    alreadyRemindedOrderIds,
  )
}

const getAlreadyRemindedOrderIds = async (
  container: MedusaContainer,
  orders: PaymentReminderOrder[],
): Promise<Set<string>> => {
  const orderIds = unique(orders.map((order) => order.id))
  if (orderIds.length === 0) {
    return new Set<string>()
  }

  const emailLogService = container.resolve<EmailLogService>(EMAIL_LOG_MODULE)
  const alreadyRemindedOrderIds = new Set<string>()

  await collectAlreadyRemindedOrderIds(
    emailLogService,
    chunk(orderIds, EMAIL_LOG_LOOKUP_BATCH_SIZE),
    0,
    alreadyRemindedOrderIds,
  )

  return alreadyRemindedOrderIds
}

const sendRemindersSequentially = async (
  container: MedusaContainer,
  orders: PaymentReminderOrder[],
  orderIndex: number,
  logger: Logger,
): Promise<number> => {
  const order = orders[orderIndex]
  if (order === undefined) {
    return 0
  }

  let sentCount = 0
  try {
    await sendReminder(container, order)
    sentCount = 1
  } catch (error) {
    logger.error(
      `Unpaid Order Payment Reminders: Failed to send reminder for order ${order.id}`,
      error instanceof Error ? error : new Error(String(error)),
    )
  }

  return (
    sentCount +
    (await sendRemindersSequentially(container, orders, orderIndex + 1, logger))
  )
}

const executePaymentReminderJob = async (
  container: MedusaContainer,
  logger: Logger,
): Promise<void> => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  logger.info("Unpaid Order Payment Reminders: Starting...")

  const unpaidOrders = await fetchUnpaidOrders(query, MAX_ORDERS_PER_RUN)
  const readyOrders = unpaidOrders.filter((order) =>
    isPaymentReminderReadyOrder(order),
  )

  if (readyOrders.length === 0) {
    logger.info(
      "Unpaid Order Payment Reminders: No unpaid orders older than 24 hours found",
    )
    return
  }

  logger.info(
    `Unpaid Order Payment Reminders: Found ${readyOrders.length} unpaid orders older than 24 hours`,
  )

  const alreadyRemindedOrderIds = await getAlreadyRemindedOrderIds(
    container,
    readyOrders,
  )
  const ordersToRemind = readyOrders.filter(
    (order) => !alreadyRemindedOrderIds.has(order.id),
  )

  if (ordersToRemind.length === 0) {
    logger.info(
      "Unpaid Order Payment Reminders: All matching orders already have a reminder email log",
    )
    return
  }

  logger.info(
    `Unpaid Order Payment Reminders: Sending ${ordersToRemind.length} reminders, skipping ${alreadyRemindedOrderIds.size} already sent`,
  )

  const sentCount = await sendRemindersSequentially(
    container,
    ordersToRemind,
    0,
    logger,
  )

  logger.info(
    `Unpaid Order Payment Reminders: Completed, sent ${sentCount} reminders`,
  )
}

const unpaidOrderPaymentRemindersJob = async (
  container: MedusaContainer,
): Promise<void> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  const result = await executeWithLockTimeout(
    lockingModule,
    JOB_LOCK_KEY,
    JOB_LOCK_TIMEOUT,
    async () => {
      await executePaymentReminderJob(container, logger)
    },
  )

  if (result.status === "timed_out") {
    logger.info(
      "Unpaid Order Payment Reminders: Skipping - another instance is already running",
    )
  }
}

export const config = {
  name: "unpaid-order-payment-reminders",
  schedule: "0 * * * *",
}

export default unpaidOrderPaymentRemindersJob
