import type { SubscriberArgs } from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

export interface PaymentPaidEvent {
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

interface PaymentQueryResult {
  payment_collection_id?: string
}

interface OrderPaymentCollectionQueryResult {
  order?: {
    id?: string
  } | null
  order_id?: string
}

/** Matches the truthiness semantics the event payload id fields rely on. */
const isPresentString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0

const firstPresentString = (values: readonly unknown[]) =>
  values.find(isPresentString)

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

const getFirstQueryRow = (data: unknown): unknown =>
  isUnknownArray(data) ? data[0] : undefined

const getExplicitEntityType = (data: PaymentPaidEvent) =>
  data.resource_type ?? data.entity ?? data.type

const hasEntityType = (data: PaymentPaidEvent, type: string) =>
  getExplicitEntityType(data) === type

/** The bare event `id` only identifies `type` when the payload declares it. */
const entityScopedId = (data: PaymentPaidEvent, type: string) =>
  hasEntityType(data, type) ? data.id : undefined

/**
 * Medusa payment events currently only carry `id`; keep the prefix fallback for
 * legacy payloads that omit an explicit entity type.
 */
const prefixedId = (id: string | undefined, prefix: string) =>
  isPresentString(id) && id.startsWith(prefix) ? id : undefined

const isOrderPaymentCollectionQueryResult = (
  value: unknown,
): value is OrderPaymentCollectionQueryResult => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["order_id"] === "string" ||
    (isRecord(value["order"]) && typeof value["order"]["id"] === "string")
  )
}

const isPaymentQueryResult = (value: unknown): value is PaymentQueryResult =>
  isRecord(value) && typeof value["payment_collection_id"] === "string"

const getOrderIdFromEventData = (data: PaymentPaidEvent) =>
  firstPresentString([
    data.order_id,
    data.order?.id,
    data.payment_collection?.order?.id,
    entityScopedId(data, "order"),
    prefixedId(data.id, "order_"),
  ])

const getPaymentCollectionIdFromEventData = (data: PaymentPaidEvent) =>
  firstPresentString([
    data.payment_collection_id,
    data.payment_collection?.id,
    entityScopedId(data, "payment_collection"),
    prefixedId(data.id, "paycol_"),
  ])

const getPaymentIdFromEventData = (data: PaymentPaidEvent) =>
  firstPresentString([
    data.payment_id,
    data.payment?.id,
    entityScopedId(data, "payment"),
    prefixedId(data.id, "pay_"),
  ])

const getOrderIdFromPaymentCollection = async (
  query: Query,
  paymentCollectionId: string,
): Promise<string | undefined> => {
  const { data }: { data: unknown } = await query.graph({
    entity: "order_payment_collection",
    fields: ["order.id", "order_id", "payment_collection_id"],
    filters: { payment_collection_id: paymentCollectionId },
  })
  const link = getFirstQueryRow(data)

  if (!isOrderPaymentCollectionQueryResult(link)) {
    return undefined
  }

  return link.order?.id ?? link.order_id
}

const getOrderIdFromPayment = async (
  query: Query,
  paymentId: string,
): Promise<string | undefined> => {
  const { data }: { data: unknown } = await query.graph({
    entity: "payment",
    fields: ["id", "payment_collection_id"],
    filters: { id: paymentId },
  })
  const payment = getFirstQueryRow(data)

  if (!isPaymentQueryResult(payment)) {
    return undefined
  }

  const paymentCollectionId = payment.payment_collection_id

  if (!isPresentString(paymentCollectionId)) {
    return undefined
  }

  return await getOrderIdFromPaymentCollection(query, paymentCollectionId)
}

export const resolveOrderIdFromPaymentEvent = async (
  container: SubscriberArgs["container"],
  data: PaymentPaidEvent,
): Promise<string | undefined> => {
  const directOrderId = getOrderIdFromEventData(data)

  if (isPresentString(directOrderId)) {
    return directOrderId
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const paymentCollectionId = getPaymentCollectionIdFromEventData(data)

  if (isPresentString(paymentCollectionId)) {
    const orderId = await getOrderIdFromPaymentCollection(
      query,
      paymentCollectionId,
    )

    if (isPresentString(orderId)) {
      return orderId
    }
  }

  const paymentId = getPaymentIdFromEventData(data)

  if (isPresentString(paymentId)) {
    return await getOrderIdFromPayment(query, paymentId)
  }

  return undefined
}
