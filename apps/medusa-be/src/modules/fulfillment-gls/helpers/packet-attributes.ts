import type {
  FulfillmentItemDTO,
  FulfillmentOrderDTO,
  Logger,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  GLSOptions,
  GLSPacketAttributes,
  GLSShippingOptionData,
} from "../../gls-client/types"

export type QueryService = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

type ProductWeightRecord = {
  id: string
  weight?: unknown
}

type OrderLineItemWithWeight = {
  id?: string
  quantity?: unknown
  product_id?: string | null
  variant?: {
    weight?: unknown
    product?: {
      id?: string | null
      weight?: unknown
    } | null
  } | null
}

type FulfillmentItemWithQuantity = {
  line_item_id?: string | null
  quantity?: unknown
}

const DEFAULT_PACKET_WEIGHT_KG = 0.5
const GRAMS_PER_KG = 1000

export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (value && typeof value === "object" && "value" in value) {
    return toFiniteNumber((value as { value: unknown }).value)
  }

  return
}

export async function buildGLSPacketAttributes(params: {
  order: Partial<FulfillmentOrderDTO>
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
  accessPointId: string
  shippingData: GLSShippingOptionData
  items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
  config: GLSOptions
  query?: QueryService
  logger: Logger
}): Promise<GLSPacketAttributes> {
  const {
    order,
    shippingAddress,
    accessPointId,
    shippingData,
    items,
    config,
    query,
    logger,
  } = params

  const recipient = getRequiredRecipientName(shippingAddress)
  const orderNumber = getPacketOrderNumber(order)
  const totalNumber = getPacketOrderTotal(order, shippingData)
  const packetWeight = await getPacketWeight(order, items, shippingData, query)

  if (packetWeight === DEFAULT_PACKET_WEIGHT_KG) {
    logger.warn(
      `GLS: Falling back to default packet weight ${DEFAULT_PACKET_WEIGHT_KG}kg for order ${orderNumber}. Fill product or variant weight in Medusa to send an exact parcel weight.`
    )
  }

  const attributes = buildBasePacketAttributes({
    accessPointId,
    config,
    currency: getPacketCurrency(order, shippingData),
    order,
    orderNumber,
    packetWeight,
    recipient,
    shippingAddress,
    totalNumber,
  })

  if (shippingData.supports_cod) {
    attributes.cod = totalNumber
  }

  return attributes
}

function medusaWeightGramsToKg(weight: number): number {
  return weight / GRAMS_PER_KG
}

function getOrderItemRawWeight(
  orderItem: OrderLineItemWithWeight,
  productWeights: Map<string, unknown>
): number | undefined {
  return (
    toFiniteNumber(orderItem.variant?.weight) ??
    toFiniteNumber(orderItem.variant?.product?.weight) ??
    (orderItem.product_id
      ? toFiniteNumber(productWeights.get(orderItem.product_id))
      : undefined)
  )
}

function getRequiredRecipientName(
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
): { firstName: string; lastName: string } {
  const firstName = shippingAddress.first_name ?? ""
  const lastName = shippingAddress.last_name ?? ""

  if (firstName || lastName) {
    return { firstName, lastName }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Shipping address first_name or last_name is required"
  )
}

function getPacketOrderNumber(order: Partial<FulfillmentOrderDTO>): string {
  return order.display_id?.toString() || order.id || `fulfillment-${Date.now()}`
}

function getPacketOrderTotal(
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData
): number {
  const orderTotal =
    toFiniteNumber(order.total) ??
    toFiniteNumber((order as { item_total?: unknown }).item_total)

  if (orderTotal !== undefined) {
    return orderTotal
  }

  if (!shippingData.supports_cod) {
    return 1
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: order total or item_total is required for COD shipments"
  )
}

async function getPacketWeight(
  order: Partial<FulfillmentOrderDTO>,
  items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
  shippingData: GLSShippingOptionData,
  query?: QueryService
): Promise<number> {
  return (
    toFiniteNumber((shippingData as { weight?: unknown }).weight) ??
    (await calculateOrderItemsWeightKg(order, items, query)) ??
    DEFAULT_PACKET_WEIGHT_KG
  )
}

function getPacketCurrency(
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData
): string {
  const currency = order.currency_code?.toUpperCase()

  if (currency) {
    return currency
  }

  if (!shippingData.supports_cod) {
    return "CZK"
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: currency_code is required on the order for COD shipments"
  )
}

function buildBasePacketAttributes(params: {
  order: Partial<FulfillmentOrderDTO>
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
  accessPointId: string
  config: GLSOptions
  currency: string
  orderNumber: string
  packetWeight: number
  recipient: { firstName: string; lastName: string }
  totalNumber: number
}): GLSPacketAttributes {
  const {
    order,
    shippingAddress,
    accessPointId,
    config,
    currency,
    orderNumber,
    packetWeight,
    recipient,
    totalNumber,
  } = params

  return {
    number: orderNumber,
    name: recipient.firstName,
    surname: recipient.lastName,
    email: order.email ?? undefined,
    phone: shippingAddress.phone ?? undefined,
    addressId: accessPointId,
    value: totalNumber,
    currency,
    weight: packetWeight,
    eshop: config.sender_label ?? undefined,
  }
}

async function calculateOrderItemsWeightKg(
  order: Partial<FulfillmentOrderDTO>,
  fulfillmentItems: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
  query?: QueryService
): Promise<number | undefined> {
  const orderItems = (order.items ?? []) as OrderLineItemWithWeight[]
  if (!orderItems.length) {
    return
  }

  const productWeights = await getProductWeights(orderItems, query)
  const orderItemsById = new Map(
    orderItems
      .filter((item): item is OrderLineItemWithWeight & { id: string } =>
        Boolean(item.id)
      )
      .map((item) => [item.id, item])
  )

  const itemsToWeigh =
    fulfillmentItems.length > 0
      ? (fulfillmentItems as FulfillmentItemWithQuantity[])
      : orderItems.map((item) => ({
          line_item_id: item.id,
          quantity: item.quantity,
        }))

  let totalWeightKg = 0
  for (const item of itemsToWeigh) {
    if (!item.line_item_id) {
      continue
    }

    const orderItem = orderItemsById.get(item.line_item_id)
    if (!orderItem) {
      continue
    }

    const rawWeight = getOrderItemRawWeight(orderItem, productWeights)

    if (rawWeight === undefined || rawWeight <= 0) {
      continue
    }

    const quantity =
      toFiniteNumber(item.quantity) ?? toFiniteNumber(orderItem.quantity) ?? 1
    totalWeightKg += medusaWeightGramsToKg(rawWeight) * quantity
  }

  return totalWeightKg > 0 ? totalWeightKg : undefined
}

async function getProductWeights(
  orderItems: OrderLineItemWithWeight[],
  query?: QueryService
): Promise<Map<string, unknown>> {
  const productIds = [
    ...new Set(
      orderItems
        .map(
          (item) => item.product_id ?? item.variant?.product?.id ?? undefined
        )
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (!query || productIds.length === 0) {
    return new Map()
  }

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "weight"],
    filters: {
      id: productIds,
    },
  })

  return new Map(
    (data as ProductWeightRecord[]).map((product) => [
      product.id,
      product.weight,
    ])
  )
}
