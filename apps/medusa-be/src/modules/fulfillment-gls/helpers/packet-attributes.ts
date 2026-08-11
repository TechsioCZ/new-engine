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
const ADDRESS_WITH_HOUSE_NUMBER_REGEX = /^(.+?)\s+(\d+[\w/-]*)$/u
const HOUSE_NUMBER_REGEX = /^(\d+)(.*)$/u

type PacketOrderTotal = {
  total: number
  usedFallback: boolean
}

type PacketCurrency = {
  currency: string
  usedFallback: boolean
}

type PacketWeight = {
  weight: number
  usedFallback: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (isRecord(value)) {
    const nestedValue: unknown = value.value
    return toFiniteNumber(nestedValue)
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
  const orderTotal = getPacketOrderTotal(order, shippingData)
  const packetWeight = await getPacketWeight(order, items, shippingData, query)
  const currency = getPacketCurrency(order, shippingData)
  const email = await getRequiredOrderEmail(order, shippingData, query)

  if (orderTotal.usedFallback) {
    logger.warn(
      `GLS: Falling back to placeholder order total 1 for non-COD order ${orderNumber}. Fill order total or item_total in Medusa to send an exact parcel value.`
    )
  }

  if (packetWeight.usedFallback) {
    logger.warn(
      `GLS: Falling back to default packet weight ${DEFAULT_PACKET_WEIGHT_KG}kg for order ${orderNumber}. Fill product or variant weight in Medusa to send an exact parcel weight.`
    )
  }

  if (currency.usedFallback) {
    logger.warn(
      `GLS: Falling back to placeholder currency CZK for non-COD order ${orderNumber}. Fill order currency_code in Medusa to send the exact parcel currency.`
    )
  }

  const attributes = buildBasePacketAttributes({
    accessPointId,
    config,
    currency: currency.currency,
    email,
    orderNumber,
    packetWeight: packetWeight.weight,
    recipient,
    shippingAddress,
    totalNumber: orderTotal.total,
  })

  if (shippingData.supports_cod) {
    attributes.cod = orderTotal.total
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
  return order.display_id?.toString() ?? order.id ?? `fulfillment-${Date.now()}`
}

function getPacketOrderTotal(
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData
): PacketOrderTotal {
  const orderRecord: unknown = order
  const itemTotal: unknown = isRecord(orderRecord)
    ? orderRecord.item_total
    : undefined
  const orderTotal = toFiniteNumber(order.total) ?? toFiniteNumber(itemTotal)

  if (orderTotal !== undefined) {
    return { total: orderTotal, usedFallback: false }
  }

  if (!shippingData.supports_cod) {
    return { total: 1, usedFallback: true }
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
): Promise<PacketWeight> {
  const explicitWeight = toFiniteNumber(shippingData.weight)
  if (explicitWeight !== undefined) {
    return { weight: explicitWeight, usedFallback: false }
  }

  const computedWeight = await calculateOrderItemsWeightKg(order, items, query)
  if (computedWeight !== undefined) {
    return { weight: computedWeight, usedFallback: false }
  }

  return { weight: DEFAULT_PACKET_WEIGHT_KG, usedFallback: true }
}

function getPacketCurrency(
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData
): PacketCurrency {
  const orderRecord: unknown = order
  const currency = getOptionalString(
    isRecord(orderRecord) ? orderRecord.currency_code : undefined
  )?.toUpperCase()

  if (currency) {
    return { currency, usedFallback: false }
  }

  if (!shippingData.supports_cod) {
    return { currency: "CZK", usedFallback: true }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: currency_code is required on the order for COD shipments"
  )
}

function buildBasePacketAttributes(params: {
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
  accessPointId: string
  config: GLSOptions
  currency: string
  email: string
  orderNumber: string
  packetWeight: number
  recipient: { firstName: string; lastName: string }
  totalNumber: number
}): GLSPacketAttributes {
  const {
    shippingAddress,
    accessPointId,
    currency,
    email,
    orderNumber,
    packetWeight,
    recipient,
    totalNumber,
  } = params
  const address = normalizeShippingAddress(shippingAddress)
  const shippingAddressRecord: unknown = shippingAddress
  const phone = getRequiredString(
    isRecord(shippingAddressRecord) ? shippingAddressRecord.phone : undefined,
    "GLS: Shipping address phone is required for ParcelShop delivery"
  )

  return {
    number: orderNumber,
    name: recipient.firstName,
    surname: recipient.lastName,
    email,
    phone,
    addressId: accessPointId,
    value: totalNumber,
    currency,
    weight: packetWeight,
    content: `Order ${orderNumber}`,
    delivery_street: address.street,
    delivery_house_number: address.houseNumber,
    delivery_house_number_info: address.houseNumberInfo,
    delivery_city: address.city,
    delivery_zip_code: address.zipCode,
    delivery_country: address.country,
  }
}

async function getRequiredOrderEmail(
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData,
  query?: QueryService
): Promise<string> {
  const orderEmail = getOrderEmail(order)
  if (orderEmail) {
    return orderEmail
  }

  const shippingDataEmail = getOptionalString(shippingData.email)
  if (shippingDataEmail) {
    return shippingDataEmail
  }

  if (order.id && query) {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "email", "customer.email"],
      filters: {
        id: order.id,
      },
    })
    const queriedEmail = getOrderEmail(data[0])

    if (queriedEmail) {
      return queriedEmail
    }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Order email is required"
  )
}

function getOrderEmail(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return
  }

  const directEmail = getOptionalString(value.email)
  if (directEmail) {
    return directEmail
  }

  const customer: unknown = value.customer
  return getOptionalString(isRecord(customer) ? customer.email : undefined)
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return
}

function getRequiredString(value: unknown, message: string): string {
  const parsed = getOptionalString(value)
  if (parsed) {
    return parsed
  }

  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

function normalizeShippingAddress(
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
): {
  street: string
  houseNumber: string
  houseNumberInfo?: string
  city: string
  zipCode: string
  country: string
} {
  const address: unknown = shippingAddress
  const addressRecord = isRecord(address) ? address : {}
  const addressLine1 = getRequiredString(
    addressRecord.address_1,
    "GLS: Shipping address address_1 is required"
  )
  const addressLine2 =
    typeof addressRecord.address_2 === "string"
      ? addressRecord.address_2.trim()
      : ""
  const parsedAddress = splitStreetAndHouseNumber(addressLine1, addressLine2)

  return {
    ...parsedAddress,
    city: getRequiredString(
      addressRecord.city,
      "GLS: Shipping address city is required"
    ),
    zipCode: getRequiredString(
      addressRecord.postal_code,
      "GLS: Shipping address postal_code is required"
    ),
    country: getRequiredString(
      addressRecord.country_code,
      "GLS: Shipping address country_code is required"
    ).toUpperCase(),
  }
}

function splitStreetAndHouseNumber(
  addressLine1: string,
  addressLine2: string
): { street: string; houseNumber: string; houseNumberInfo?: string } {
  const match = addressLine1.match(ADDRESS_WITH_HOUSE_NUMBER_REGEX)
  if (match?.[1] && match[2]) {
    const parsed = parseHouseNumber(match[2])
    if (parsed) {
      return {
        street: match[1].trim(),
        houseNumber: parsed.houseNumber,
        houseNumberInfo: parsed.houseNumberInfo,
      }
    }
  }

  const explicitHouseNumber = parseHouseNumber(addressLine2)
  if (explicitHouseNumber) {
    return {
      street: addressLine1,
      houseNumber: explicitHouseNumber.houseNumber,
      houseNumberInfo: explicitHouseNumber.houseNumberInfo,
    }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Shipping address must include a numeric house number (address_1 or address_2)"
  )
}

function parseHouseNumber(
  value: string
): { houseNumber: string; houseNumberInfo?: string } | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const match = trimmed.match(HOUSE_NUMBER_REGEX)
  if (!match?.[1]) {
    return null
  }

  const houseNumberInfo = match[2]?.trim()
  return {
    houseNumber: match[1],
    houseNumberInfo: houseNumberInfo || undefined,
  }
}

function isOrderLineItemWithWeight(
  value: unknown
): value is OrderLineItemWithWeight {
  if (!isRecord(value)) {
    return false
  }

  const id: unknown = value.id
  const productId: unknown = value.product_id
  const variant: unknown = value.variant

  return (
    (id === undefined || typeof id === "string") &&
    (productId === undefined ||
      productId === null ||
      typeof productId === "string") &&
    (variant === undefined || variant === null || isRecord(variant))
  )
}

function isFulfillmentItemWithQuantity(
  value: unknown
): value is FulfillmentItemWithQuantity {
  if (!isRecord(value)) {
    return false
  }

  const lineItemId: unknown = value.line_item_id
  return (
    lineItemId === undefined ||
    lineItemId === null ||
    typeof lineItemId === "string"
  )
}

function isProductWeightRecord(value: unknown): value is ProductWeightRecord {
  return isRecord(value) && typeof value.id === "string"
}

async function calculateOrderItemsWeightKg(
  order: Partial<FulfillmentOrderDTO>,
  fulfillmentItems: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
  query?: QueryService
): Promise<number | undefined> {
  const rawOrderItems: unknown = order.items
  const orderItems = Array.isArray(rawOrderItems)
    ? rawOrderItems.filter(isOrderLineItemWithWeight)
    : []
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

  const rawFulfillmentItems: unknown = fulfillmentItems
  const fulfillmentItemsWithQuantity = Array.isArray(rawFulfillmentItems)
    ? rawFulfillmentItems.filter(isFulfillmentItemWithQuantity)
    : []
  const itemsToWeigh =
    fulfillmentItemsWithQuantity.length > 0
      ? fulfillmentItemsWithQuantity
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
    data
      .filter(isProductWeightRecord)
      .map((product) => [product.id, product.weight])
  )
}
