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

export interface QueryService {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

interface ProductWeightRecord {
  id: string
  weight?: unknown
}

interface OrderLineItemWithWeight {
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

interface FulfillmentItemWithQuantity {
  line_item_id?: string | null
  quantity?: unknown
}

interface PacketOrderTotal {
  total: number
  usedFallback: boolean
}

interface PacketCurrency {
  currency: string
  usedFallback: boolean
}

interface PacketWeight {
  weight: number
  usedFallback: boolean
}

interface ParsedAddress {
  street: string
  houseNumber: string
  houseNumberInfo: string | undefined
}

const DEFAULT_PACKET_WEIGHT_KG = 0.5
const GRAMS_PER_KG = 1000
const ADDRESS_WITH_HOUSE_NUMBER_REGEX =
  /^(?<street>.+?)\s+(?<houseNumber>\d+[\w/-]*)$/u
const HOUSE_NUMBER_REGEX = /^(?<houseNumber>\d+)(?<houseNumberInfo>.*)$/u
const FLOAT_PREFIX_REGEX =
  /^[+-]?(?:Infinity|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/u

const isGlsPacketObjectLike = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const getOptionalString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }

  return undefined
}

const getRequiredString = (value: unknown, message: string): string => {
  const parsed = getOptionalString(value)
  if (parsed !== undefined) {
    return parsed
  }

  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

export const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const numericPrefix = FLOAT_PREFIX_REGEX.exec(value.trimStart())?.[0]
    if (numericPrefix === undefined) {
      return undefined
    }

    const parsed = Number(numericPrefix)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (isGlsPacketObjectLike(value)) {
    const nestedValue: unknown = value["value"]
    return toFiniteNumber(nestedValue)
  }

  return undefined
}

const parseHouseNumber = (
  value: string,
): Omit<ParsedAddress, "street"> | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const groups = HOUSE_NUMBER_REGEX.exec(trimmed)?.groups
  const houseNumber = groups?.["houseNumber"]
  if (houseNumber === undefined || houseNumber.length === 0) {
    return null
  }

  const houseNumberInfo = groups?.["houseNumberInfo"]?.trim()
  return {
    houseNumber,
    houseNumberInfo:
      houseNumberInfo !== undefined && houseNumberInfo.length > 0
        ? houseNumberInfo
        : undefined,
  }
}

const splitStreetAndHouseNumber = (
  addressLine1: string,
  addressLine2: string,
): ParsedAddress => {
  const groups = ADDRESS_WITH_HOUSE_NUMBER_REGEX.exec(addressLine1)?.groups
  const street = groups?.["street"]
  const matchedHouseNumber = groups?.["houseNumber"]
  if (
    street !== undefined &&
    street.length > 0 &&
    matchedHouseNumber !== undefined &&
    matchedHouseNumber.length > 0
  ) {
    const parsed = parseHouseNumber(matchedHouseNumber)
    if (parsed !== null) {
      return {
        houseNumber: parsed.houseNumber,
        houseNumberInfo: parsed.houseNumberInfo,
        street: street.trim(),
      }
    }
  }

  const explicitHouseNumber = parseHouseNumber(addressLine2)
  if (explicitHouseNumber !== null) {
    return {
      houseNumber: explicitHouseNumber.houseNumber,
      houseNumberInfo: explicitHouseNumber.houseNumberInfo,
      street: addressLine1,
    }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Shipping address must include a numeric house number (address_1 or address_2)",
  )
}

const normalizeShippingAddress = (
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>,
): {
  street: string
  houseNumber: string
  houseNumberInfo: string | undefined
  city: string
  zipCode: string
  country: string
} => {
  const address: unknown = shippingAddress
  const addressRecord = isGlsPacketObjectLike(address) ? address : {}
  const addressLine1 = getRequiredString(
    addressRecord["address_1"],
    "GLS: Shipping address address_1 is required",
  )
  const addressLine2 =
    typeof addressRecord["address_2"] === "string"
      ? addressRecord["address_2"].trim()
      : ""
  const parsedAddress = splitStreetAndHouseNumber(addressLine1, addressLine2)

  return {
    ...parsedAddress,
    city: getRequiredString(
      addressRecord["city"],
      "GLS: Shipping address city is required",
    ),
    country: getRequiredString(
      addressRecord["country_code"],
      "GLS: Shipping address country_code is required",
    ).toUpperCase(),
    zipCode: getRequiredString(
      addressRecord["postal_code"],
      "GLS: Shipping address postal_code is required",
    ),
  }
}

const getOrderEmail = (value: unknown): string | undefined => {
  if (!isGlsPacketObjectLike(value)) {
    return undefined
  }

  const directEmail = getOptionalString(value["email"])
  if (directEmail !== undefined) {
    return directEmail
  }

  const customer: unknown = value["customer"]
  return getOptionalString(
    isGlsPacketObjectLike(customer) ? customer["email"] : undefined,
  )
}

const getRequiredOrderEmail = async (
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData,
  query?: QueryService,
): Promise<string> => {
  const orderEmail = getOrderEmail(order)
  if (orderEmail !== undefined) {
    return orderEmail
  }

  const shippingDataEmail = getOptionalString(shippingData.email)
  if (shippingDataEmail !== undefined) {
    return shippingDataEmail
  }

  if (order.id !== undefined && order.id.length > 0 && query !== undefined) {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "email", "customer.email"],
      filters: {
        id: order.id,
      },
    })
    const queriedEmail = getOrderEmail(data[0])

    if (queriedEmail !== undefined) {
      return queriedEmail
    }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Order email is required",
  )
}

const getRequiredRecipientName = (
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>,
): { firstName: string; lastName: string } => {
  const firstName = shippingAddress.first_name ?? ""
  const lastName = shippingAddress.last_name ?? ""

  if (firstName.length > 0 || lastName.length > 0) {
    return { firstName, lastName }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Shipping address first_name or last_name is required",
  )
}

const getPacketOrderNumber = (order: Partial<FulfillmentOrderDTO>): string =>
  order.display_id?.toString() ?? order.id ?? `fulfillment-${Date.now()}`

const getPacketOrderTotal = (
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData,
): PacketOrderTotal => {
  const orderRecord: unknown = order
  const itemTotal: unknown = isGlsPacketObjectLike(orderRecord)
    ? orderRecord["item_total"]
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
    "GLS: order total or item_total is required for COD shipments",
  )
}

const getPacketCurrency = (
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData,
): PacketCurrency => {
  const orderRecord: unknown = order
  const currency = getOptionalString(
    isGlsPacketObjectLike(orderRecord)
      ? orderRecord["currency_code"]
      : undefined,
  )?.toUpperCase()

  if (currency !== undefined && currency.length > 0) {
    return { currency, usedFallback: false }
  }

  if (!shippingData.supports_cod) {
    return { currency: "CZK", usedFallback: true }
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: currency_code is required on the order for COD shipments",
  )
}

const medusaWeightGramsToKg = (weight: number): number => weight / GRAMS_PER_KG

const getOrderItemRawWeight = (
  orderItem: OrderLineItemWithWeight,
  productWeights: Map<string, unknown>,
): number | undefined => {
  const variantWeight = toFiniteNumber(orderItem.variant?.weight)
  if (variantWeight !== undefined) {
    return variantWeight
  }

  const variantProductWeight = toFiniteNumber(
    orderItem.variant?.product?.weight,
  )
  if (variantProductWeight !== undefined) {
    return variantProductWeight
  }

  const productId = orderItem.product_id
  return productId === undefined || productId === null
    ? undefined
    : toFiniteNumber(productWeights.get(productId))
}

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string"

const isOptionalNullableString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string"

const isOptionalNullableRecord = (value: unknown): boolean =>
  value === undefined || value === null || isGlsPacketObjectLike(value)

const isOrderLineItemWithWeight = (
  value: unknown,
): value is OrderLineItemWithWeight => {
  if (!isGlsPacketObjectLike(value)) {
    return false
  }

  const { id, product_id: productId, variant } = value
  return (
    isOptionalString(id) &&
    isOptionalNullableString(productId) &&
    isOptionalNullableRecord(variant)
  )
}

const isFulfillmentItemWithQuantity = (
  value: unknown,
): value is FulfillmentItemWithQuantity => {
  if (!isGlsPacketObjectLike(value)) {
    return false
  }

  const lineItemId: unknown = value["line_item_id"]
  return isOptionalNullableString(lineItemId)
}

const isProductWeightRecord = (value: unknown): value is ProductWeightRecord =>
  isGlsPacketObjectLike(value) && typeof value["id"] === "string"

const getProductWeights = async (
  orderItems: OrderLineItemWithWeight[],
  query?: QueryService,
): Promise<Map<string, unknown>> => {
  const productIds = [
    ...new Set(
      orderItems
        .map(
          (item) => item.product_id ?? item.variant?.product?.id ?? undefined,
        )
        .filter(
          (id): id is string =>
            id !== undefined && id !== null && id.length > 0,
        ),
    ),
  ]

  if (query === undefined || productIds.length === 0) {
    return new Map()
  }

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "weight"],
    filters: {
      id: productIds,
    },
  })
  const productWeights = new Map<string, unknown>()

  for (const product of data) {
    if (isProductWeightRecord(product)) {
      productWeights.set(product.id, product.weight)
    }
  }

  return productWeights
}

const calculateOrderItemsWeightKg = async (
  order: Partial<FulfillmentOrderDTO>,
  fulfillmentItems: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
  query?: QueryService,
): Promise<number | undefined> => {
  const rawOrderItems: unknown = order.items
  const orderItems = Array.isArray(rawOrderItems)
    ? rawOrderItems.filter(isOrderLineItemWithWeight)
    : []
  if (orderItems.length === 0) {
    return undefined
  }

  const productWeights = await getProductWeights(orderItems, query)
  const orderItemsById = new Map(
    orderItems
      .filter(
        (item): item is OrderLineItemWithWeight & { id: string } =>
          item.id !== undefined && item.id.length > 0,
      )
      .map((item) => [item.id, item]),
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
    const lineItemId = item.line_item_id
    if (
      lineItemId === undefined ||
      lineItemId === null ||
      lineItemId.length === 0
    ) {
      continue
    }

    const orderItem = orderItemsById.get(lineItemId)
    if (orderItem !== undefined) {
      const rawWeight = getOrderItemRawWeight(orderItem, productWeights)
      if (rawWeight !== undefined && rawWeight > 0) {
        const quantity =
          toFiniteNumber(item.quantity) ??
          toFiniteNumber(orderItem.quantity) ??
          1
        totalWeightKg += medusaWeightGramsToKg(rawWeight) * quantity
      }
    }
  }

  return totalWeightKg > 0 ? totalWeightKg : undefined
}

const getPacketWeight = async (
  order: Partial<FulfillmentOrderDTO>,
  items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
  shippingData: GLSShippingOptionData,
  query?: QueryService,
): Promise<PacketWeight> => {
  const explicitWeight = toFiniteNumber(shippingData.weight)
  if (explicitWeight !== undefined) {
    return { usedFallback: false, weight: explicitWeight }
  }

  const computedWeight = await calculateOrderItemsWeightKg(order, items, query)
  if (computedWeight !== undefined) {
    return { usedFallback: false, weight: computedWeight }
  }

  return { usedFallback: true, weight: DEFAULT_PACKET_WEIGHT_KG }
}

const buildBasePacketAttributes = (params: {
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
  accessPointId: string
  config: GLSOptions
  currency: string
  email: string
  orderNumber: string
  packetWeight: number
  recipient: { firstName: string; lastName: string }
  totalNumber: number
}): GLSPacketAttributes => {
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
    isGlsPacketObjectLike(shippingAddressRecord)
      ? shippingAddressRecord["phone"]
      : undefined,
    "GLS: Shipping address phone is required for ParcelShop delivery",
  )

  const attributes: GLSPacketAttributes = {
    addressId: accessPointId,
    content: `Order ${orderNumber}`,
    currency,
    delivery_city: address.city,
    delivery_country: address.country,
    delivery_house_number: address.houseNumber,
    delivery_street: address.street,
    delivery_zip_code: address.zipCode,
    email,
    name: recipient.firstName,
    number: orderNumber,
    phone,
    surname: recipient.lastName,
    value: totalNumber,
    weight: packetWeight,
  }

  if (address.houseNumberInfo !== undefined) {
    attributes.delivery_house_number_info = address.houseNumberInfo
  }

  return attributes
}

export const buildGLSPacketAttributes = async (params: {
  order: Partial<FulfillmentOrderDTO>
  shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
  accessPointId: string
  shippingData: GLSShippingOptionData
  items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
  config: GLSOptions
  query?: QueryService
  logger: Logger
}): Promise<GLSPacketAttributes> => {
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
      `GLS: Falling back to placeholder order total 1 for non-COD order ${orderNumber}. Fill order total or item_total in Medusa to send an exact parcel value.`,
    )
  }

  if (packetWeight.usedFallback) {
    logger.warn(
      `GLS: Falling back to default packet weight ${DEFAULT_PACKET_WEIGHT_KG}kg for order ${orderNumber}. Fill product or variant weight in Medusa to send an exact parcel weight.`,
    )
  }

  if (currency.usedFallback) {
    logger.warn(
      `GLS: Falling back to placeholder currency CZK for non-COD order ${orderNumber}. Fill order currency_code in Medusa to send the exact parcel currency.`,
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
