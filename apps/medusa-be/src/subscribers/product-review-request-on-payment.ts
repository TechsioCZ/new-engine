import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { scheduleProductReviewRequestForOrder } from "../utils/product-review-request-queue"
import {
  type PaymentPaidEvent,
  resolveOrderIdFromPaymentEvent,
} from "../subscriber-helpers/product-review-request-on-payment/helper"

export default async function productReviewRequestOnPaymentHandler({
  event,
  container,
}: SubscriberArgs<PaymentPaidEvent>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderId = await resolveOrderIdFromPaymentEvent(container, event.data)

  if (!orderId) {
    logger.warn(
      `Skipping product review request queueing: could not resolve order from ${event.name} event ${JSON.stringify(event.data)}`
    )
    return
  }

  await scheduleProductReviewRequestForOrder({
    container,
    logger,
    orderId,
  })
}

export const config: SubscriberConfig = {
  event: ["payment.captured", "payment_collection.completed"],
}
