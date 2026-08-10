import type {
  FulfillmentItemDTO,
  FulfillmentOrderDTO,
  Logger,
  Query,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import type {
  GLSOptions,
  GLSPacketAttributes,
  GLSShippingOptionData,
} from "../../gls-client/types"

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

const isGlsPacketObjectLike = (value: unknown): value is object =>
  typeof value === "object" && value !== null

const getObjectValue = (value: object, key: string): unknown =>
  Reflect.get(value, key)

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
    return toFiniteNumber(getObjectValue(value, "value"))
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
  const addressLine1 = getRequiredString(
    shippingAddress.address_1,
    "GLS: Shipping address address_1 is required",
  )
  const addressLine2 = shippingAddress.address_2?.trim() ?? ""
  const parsedAddress = splitStreetAndHouseNumber(addressLine1, addressLine2)

  return {
    ...parsedAddress,
    city: getRequiredString(
      shippingAddress.city,
      "GLS: Shipping address city is required",
    ),
    country: getRequiredString(
      shippingAddress.country_code,
      "GLS: Shipping address country_code is required",
    ).toUpperCase(),
    zipCode: getRequiredString(
      shippingAddress.postal_code,
      "GLS: Shipping address postal_code is required",
    ),
  }
}

const queriedOrderEmailSchema = z.object({
  customer: z
    .object({
      email: z.string().optional(),
    })
    .nullish(),
  email: z.string().optional(),
})

const getQueriedOrderEmail = (value: unknown): string | undefined => {
  const parsed = queriedOrderEmailSchema.safeParse(value)
  if (!parsed.success) {
    return undefined
  }

  return (
    getOptionalString(parsed.data.email) ??
    getOptionalString(parsed.data.customer?.email)
  )
}

const getRequiredOrderEmail = async (
  order: Partial<FulfillmentOrderDTO>,
  shippingData: GLSShippingOptionData,
  query?: Query,
): Promise<string> => {
  const orderEmail = getOptionalString(order.email)
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
    const queriedEmail = getQueriedOrderEmail(data[0])

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
  const orderTotal =
    toFiniteNumber(order.total) ?? toFiniteNumber(order.item_total)

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
  const currency = getOptionalString(order.currency_code)?.toUpperCase()

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

const productWeightSchema = z.object({
  id: z.string(),
  weight: z.unknown().optional(),
})

const embeddedVariantSchema = z
  .object({
    product: z
      .object({
        id: z.string().nullish(),
        weight: z.unknown().optional(),
      })
      .nullish(),
    weight: z.unknown().optional(),
  })
  .nullish()

const getEmbeddedVariant = (
  orderItem: NonNullable<FulfillmentOrderDTO["items"]>[number],
): z.infer<typeof embeddedVariantSchema> => {
  const parsed = embeddedVariantSchema.safeParse(
    getObjectValue(orderItem, "variant"),
  )
  return parsed.success ? parsed.data : undefined
}

const getProductWeights = async (
  orderItems: NonNullable<FulfillmentOrderDTO["items"]>,
  query?: Query,
): Promise<Map<string, number>> => {
  const productIds = [
    ...new Set(
      orderItems
        .map(
          (item) =>
            item.product_id ??
            getEmbeddedVariant(item)?.product?.id ??
            undefined,
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

  const result = await query.graph({
    entity: "product",
    fields: ["id", "weight"],
    filters: {
      id: productIds,
    },
  })
  const parsed = z.array(productWeightSchema).safeParse(result.data)
  if (!parsed.success) {
    return new Map()
  }

  const weights = new Map<string, number>()
  for (const product of parsed.data) {
    const weight = toFiniteNumber(product.weight)
    if (weight !== undefined) {
      weights.set(product.id, weight)
    }
  }
  return weights
}

const getOrderItemRawWeight = (
  orderItem: NonNullable<FulfillmentOrderDTO["items"]>[number],
  productWeights: ReadonlyMap<string, number>,
): number | undefined => {
  const embeddedVariant = getEmbeddedVariant(orderItem)
  const embeddedWeight =
    toFiniteNumber(embeddedVariant?.weight) ??
    toFiniteNumber(embeddedVariant?.product?.weight)
  if (embeddedWeight !== undefined) {
    return embeddedWeight
  }

  const productId = orderItem.product_id ?? embeddedVariant?.product?.id
  return productId === undefined || productId === null
    ? undefined
    : productWeights.get(productId)
}

const calculateOrderItemsWeightKg = async (
  order: Partial<FulfillmentOrderDTO>,
  fulfillmentItems: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
  query?: Query,
): Promise<number | undefined> => {
  const orderItems = order.items ?? []
  if (orderItems.length === 0) {
    return undefined
  }

  const productWeights = await getProductWeights(orderItems, query)
  const orderItemsById = new Map(orderItems.map((item) => [item.id, item]))
  const itemsToWeigh =
    fulfillmentItems.length > 0
      ? fulfillmentItems
      : orderItems.map((item) => ({
          line_item_id: item.id,
          quantity: item.quantity,
        }))

  let totalWeightKg = 0
  for (const item of itemsToWeigh) {
    const lineItemId = item.line_item_id
    const orderItem =
      lineItemId === undefined || lineItemId === null || lineItemId.length === 0
        ? undefined
        : orderItemsById.get(lineItemId)

    if (orderItem !== undefined) {
      const rawWeight = getOrderItemRawWeight(orderItem, productWeights)
      if (rawWeight !== undefined && rawWeight > 0) {
        const quantity = item.quantity ?? orderItem.quantity
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
  query?: Query,
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
  const phone = getRequiredString(
    shippingAddress.phone,
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
  query?: Query
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
