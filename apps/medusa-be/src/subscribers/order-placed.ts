import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendOrderReceiptWorkflow } from "../workflows/send-order-receipt"

type OrderPlacedEvent = {
  id: string
}

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  await sendOrderReceiptWorkflow(container).run({
    input: {
      order_id: data.id,
      store_name: process.env.STORE_NAME,
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
