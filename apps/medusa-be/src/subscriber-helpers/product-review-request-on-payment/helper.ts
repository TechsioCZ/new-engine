import type { SubscriberArgs } from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type PaymentPaidEvent = {
  entity?: string
  id?: string
  order?: {
    id?: string
  }
  order_id?: string
  payment?: {
    id?: string
  }
  payment_collection?: {
    id?: string
    order?: {
      id?: string
    }
  }
  payment_collection_id?: string
  payment_id?: string
  resource_type?: string
  type?: string
}

type PaymentQueryResult = {
  payment_collection_id?: string
}

type OrderPaymentCollectionQueryResult = {
  order?: {
    id?: string
  } | null
  order_id?: string
}

function getExplicitEntityType(data: PaymentPaidEvent) {
  return data.resource_type ?? data.entity ?? data.type
}

function hasEntityType(data: PaymentPaidEvent, type: string) {
  return getExplicitEntityType(data) === type
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isOrderPaymentCollectionQueryResult(
  value: unknown
): value is OrderPaymentCollectionQueryResult {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.order_id === "string" ||
    (isRecord(value.order) && typeof value.order.id === "string")
  )
}

function isPaymentQueryResult(value: unknown): value is PaymentQueryResult {
  return isRecord(value) && typeof value.payment_collection_id === "string"
}

function getOrderIdFromEventData(data: PaymentPaidEvent): string | undefined {
  if (data.order_id) {
    return data.order_id
  }

  if (data.order?.id) {
    return data.order.id
  }

  if (data.payment_collection?.order?.id) {
    return data.payment_collection.order.id
  }

  if (hasEntityType(data, "order") && data.id) {
    return data.id
  }

  // Medusa payment events currently only carry `id`; keep prefix fallback for legacy payloads.
  if (data.id?.startsWith("order_")) {
    return data.id
  }

  return undefined
}

function getPaymentCollectionIdFromEventData(
  data: PaymentPaidEvent
): string | undefined {
  if (data.payment_collection_id) {
    return data.payment_collection_id
  }

  if (data.payment_collection?.id) {
    return data.payment_collection.id
  }

  if (hasEntityType(data, "payment_collection") && data.id) {
    return data.id
  }

  // Medusa payment events currently only carry `id`; keep prefix fallback for legacy payloads.
  if (data.id?.startsWith("paycol_")) {
    return data.id
  }

  return undefined
}

function getPaymentIdFromEventData(data: PaymentPaidEvent): string | undefined {
  if (data.payment_id) {
    return data.payment_id
  }

  if (data.payment?.id) {
    return data.payment.id
  }

  if (hasEntityType(data, "payment") && data.id) {
    return data.id
  }

  // Medusa payment events currently only carry `id`; keep prefix fallback for legacy payloads.
  if (data.id?.startsWith("pay_")) {
    return data.id
  }

  return undefined
}

async function getOrderIdFromPaymentCollection(
  query: Query,
  paymentCollectionId: string
) {
  const { data } = await query.graph({
    entity: "order_payment_collection",
    fields: ["order.id", "order_id", "payment_collection_id"],
    filters: { payment_collection_id: paymentCollectionId },
  })
  if (!Array.isArray(data) || !isOrderPaymentCollectionQueryResult(data[0])) {
    return undefined
  }

  const link = data[0]

  return link.order?.id ?? link.order_id
}

async function getOrderIdFromPayment(query: Query, paymentId: string) {
  const { data } = await query.graph({
    entity: "payment",
    fields: ["id", "payment_collection_id"],
    filters: { id: paymentId },
  })
  if (!Array.isArray(data) || !isPaymentQueryResult(data[0])) {
    return undefined
  }

  const paymentCollectionId = data[0].payment_collection_id

  if (!paymentCollectionId) {
    return undefined
  }

  return getOrderIdFromPaymentCollection(query, paymentCollectionId)
}

export async function resolveOrderIdFromPaymentEvent(
  container: SubscriberArgs["container"],
  data: PaymentPaidEvent
): Promise<string | undefined> {
  const directOrderId = getOrderIdFromEventData(data)

  if (directOrderId) {
    return directOrderId
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const paymentCollectionId = getPaymentCollectionIdFromEventData(data)

  if (paymentCollectionId) {
    const orderId = await getOrderIdFromPaymentCollection(
      query,
      paymentCollectionId
    )

    if (orderId) {
      return orderId
    }
  }

  const paymentId = getPaymentIdFromEventData(data)

  if (paymentId) {
    return getOrderIdFromPayment(query, paymentId)
  }

  return undefined
}
