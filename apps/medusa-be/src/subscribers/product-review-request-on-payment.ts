import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { PaymentPaidEvent } from "../subscriber-helpers/product-review-request-on-payment/helper"
import { scheduleProductReviewRequestWorkflow } from "../workflows/product-review/schedule-product-review-request"

export default async function productReviewRequestOnPaymentHandler({
  event,
  container,
}: SubscriberArgs<PaymentPaidEvent>) {
  await scheduleProductReviewRequestWorkflow(container).run({
    input: {
      event_data: event.data,
      event_name: event.name,
    },
  })
}

export const config: SubscriberConfig = {
  event: ["payment.captured", "payment_collection.completed"],
}
