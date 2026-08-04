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

type OrderWithEmail = {
  id?: string
  email?: unknown
  customer?: {
    email?: unknown
  } | null
}

type FulfillmentItemWithQuantity = {
  line_item_id?: string | null
  quantity?: unknown
}

type ShippingAddressRecord = NonNullable<
  FulfillmentOrderDTO["shipping_address"]
> & {
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
}

const DEFAULT_PACKET_WEIGHT_KG = 0.5
const GRAMS_PER_KG = 1000
const ADDRESS_WITH_HOUSE_NUMBER_REGEX = /^(.+?)\s+(\d+[\w/-]*)$/u
const HOUSE_NUMBER_REGEX = /^(\d+)(.*)$/u

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
  const email = await getRequiredOrderEmail(order, shippingData, query)

  if (packetWeight === DEFAULT_PACKET_WEIGHT_KG) {
    logger.warn(
      `GLS: Falling back to default packet weight ${DEFAULT_PACKET_WEIGHT_KG}kg for order ${orderNumber}. Fill product or variant weight in Medusa to send an exact parcel weight.`
    )
  }

  const attributes = buildBasePacketAttributes({
    accessPointId,
    config,
    currency: getPacketCurrency(order, shippingData),
    email,
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
  return order.display_id?.toString() ?? order.id ?? `fulfillment-${Date.now()}`
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
  const phone = getRequiredString(
    (shippingAddress as ShippingAddressRecord).phone,
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
  const directEmail = getOptionalString((order as OrderWithEmail).email)
  if (directEmail) {
    return directEmail
  }

  const customerEmail = getOptionalString(
    (order as OrderWithEmail).customer?.email
  )
  if (customerEmail) {
    return customerEmail
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
    const queriedOrder = data[0] as OrderWithEmail | undefined
    const queriedEmail =
      getOptionalString(queriedOrder?.email) ??
      getOptionalString(queriedOrder?.customer?.email)

    if (queriedEmail) {
      return queriedEmail
    }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Order email is required"
  )
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
  const address = shippingAddress as ShippingAddressRecord
  const addressLine1 = getRequiredString(
    address.address_1,
    "GLS: Shipping address address_1 is required"
  )
  const addressLine2 =
    typeof address.address_2 === "string" ? address.address_2.trim() : ""
  const parsedAddress = splitStreetAndHouseNumber(addressLine1, addressLine2)

  return {
    ...parsedAddress,
    city: getRequiredString(
      address.city,
      "GLS: Shipping address city is required"
    ),
    zipCode: getRequiredString(
      address.postal_code,
      "GLS: Shipping address postal_code is required"
    ),
    country: getRequiredString(
      address.country_code,
      "GLS: Shipping address country_code is required"
    ).toUpperCase(),
  }
}

function splitStreetAndHouseNumber(
  addressLine1: string,
  addressLine2: string
): { street: string; houseNumber: string; houseNumberInfo?: string } {
  const explicitHouseNumber = parseHouseNumber(addressLine2)
  if (explicitHouseNumber) {
    return {
      street: addressLine1,
      houseNumber: explicitHouseNumber.houseNumber,
      houseNumberInfo: explicitHouseNumber.houseNumberInfo,
    }
  }

  const match = addressLine1.match(ADDRESS_WITH_HOUSE_NUMBER_REGEX)
  if (!(match?.[1] && match[2])) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Shipping address must include a numeric house number (address_1 or address_2)"
    )
  }

  const parsed = parseHouseNumber(match[2])
  if (!parsed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Shipping address house number must contain a number"
    )
  }

  return {
    street: match[1].trim(),
    houseNumber: parsed.houseNumber,
    houseNumberInfo: parsed.houseNumberInfo,
  }
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
