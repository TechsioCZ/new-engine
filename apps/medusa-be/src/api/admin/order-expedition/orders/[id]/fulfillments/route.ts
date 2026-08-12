import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows"
import type { PostAdminOrderExpeditionFulfillmentSchemaType } from "../../../validators"

type FulfillmentLineItem = {
  detail?: {
    fulfilled_quantity?: unknown
    quantity?: unknown
  } | null
  id: string
  quantity?: unknown
  requires_shipping?: boolean | null
  title?: string | null
  variant?: {
    product?: {
      shipping_profile?: {
        id?: string | null
      } | null
    } | null
  } | null
}

type FulfillmentOrder = {
  id: string
  items?: FulfillmentLineItem[] | null
  shipping_methods?: Array<{
    shipping_option_id?: string | null
  }> | null
  status?: string | null
}

type FulfillmentShippingOption = {
  id: string
  provider_id?: string | null
  service_zone?: {
    fulfillment_set?: {
      location?: {
        id?: string | null
      } | null
    } | null
  } | null
  shipping_profile_id?: string | null
}

type PreparedFulfillment = {
  items: Array<{
    id: string
    quantity: number
  }>
  shippingOptionId: string
}

const ORDER_FIELDS = [
  "id",
  "status",
  "items.id",
  "items.title",
  "items.quantity",
  "items.requires_shipping",
  "items.detail.fulfilled_quantity",
  "items.detail.quantity",
  "items.variant.product.shipping_profile.id",
  "shipping_methods.shipping_option_id",
]

const SHIPPING_OPTION_FIELDS = [
  "id",
  "provider_id",
  "shipping_profile_id",
  "service_zone.fulfillment_set.location.id",
]

export async function POST(
  request: MedusaRequest<PostAdminOrderExpeditionFulfillmentSchemaType>,
  response: MedusaResponse
): Promise<void> {
  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const orderId = request.params.id

  if (!orderId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order id is required"
    )
  }

  const order = await fetchOrder(query, orderId)
  const preparedFulfillment = await prepareFulfillment(
    query,
    order,
    request.validatedBody.location_id
  )

  const { result: fulfillment } = await createOrderFulfillmentWorkflow(
    request.scope
  ).run({
    input: {
      items: preparedFulfillment.items,
      location_id: request.validatedBody.location_id,
      no_notification: request.validatedBody.no_notification,
      order_id: order.id,
      shipping_option_id: preparedFulfillment.shippingOptionId,
    },
  })

  response.status(200).json({ fulfillment })
}

async function fetchOrder(
  query: Query,
  orderId: string
): Promise<FulfillmentOrder> {
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })
  const order = data[0] as FulfillmentOrder | undefined

  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${orderId} was not found`
    )
  }

  if (order.status === "canceled") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Canceled order ${orderId} cannot be fulfilled`
    )
  }

  return order
}

async function prepareFulfillment(
  query: Query,
  order: FulfillmentOrder,
  locationId: string
): Promise<PreparedFulfillment> {
  const shippingOptionIds = [
    ...new Set(
      (order.shipping_methods ?? [])
        .map((shippingMethod) => shippingMethod.shipping_option_id)
        .filter(isString)
    ),
  ]

  if (!shippingOptionIds.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Order ${order.id} has no original shipping option`
    )
  }

  const shippingOptions = await fetchShippingOptions(query, shippingOptionIds)
  const availableShippingOptions = shippingOptions.filter(
    (candidateShippingOption) =>
      isShippingOptionAtLocation(candidateShippingOption, locationId)
  )

  if (!availableShippingOptions.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `The order shipping option is not available at stock location ${locationId}`
    )
  }

  const fulfillableItems = (order.items ?? []).filter(
    (item) =>
      item.requires_shipping === true && getFulfillableQuantity(item) > 0
  )

  if (!fulfillableItems.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Order ${order.id} has no remaining shippable quantity to fulfill`
    )
  }

  const matchingShippingOptions = getCompatibleShippingOptions(
    availableShippingOptions,
    fulfillableItems
  )
  const selectedShippingOption = matchingShippingOptions[0]

  if (!selectedShippingOption) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `No original shipping option matches every remaining shippable item in order ${order.id}`
    )
  }

  if (matchingShippingOptions.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Order ${order.id} has multiple matching shipping options`
    )
  }

  if (!selectedShippingOption.provider_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Shipping option ${selectedShippingOption.id} has no fulfillment provider`
    )
  }

  return {
    items: fulfillableItems.map((item) => ({
      id: item.id,
      quantity: getFulfillableQuantity(item),
    })),
    shippingOptionId: selectedShippingOption.id,
  }
}

async function fetchShippingOptions(
  query: Query,
  shippingOptionIds: string[]
): Promise<FulfillmentShippingOption[]> {
  const { data } = await query.graph({
    entity: "shipping_option",
    fields: SHIPPING_OPTION_FIELDS,
    filters: { id: { $in: shippingOptionIds } },
  })

  return data as FulfillmentShippingOption[]
}

function getFulfillableQuantity(item: FulfillmentLineItem): number {
  const orderedQuantity = toSafeQuantity(item.quantity ?? item.detail?.quantity)
  const fulfilledQuantity = toSafeQuantity(item.detail?.fulfilled_quantity ?? 0)

  return Math.max(orderedQuantity - fulfilledQuantity, 0)
}

function matchesShippingProfile(
  item: FulfillmentLineItem,
  shippingOption: FulfillmentShippingOption
): boolean {
  const itemShippingProfileId = item.variant?.product?.shipping_profile?.id

  return Boolean(
    itemShippingProfileId &&
      shippingOption.shipping_profile_id === itemShippingProfileId
  )
}

function isShippingOptionAtLocation(
  shippingOption: FulfillmentShippingOption,
  locationId: string
): boolean {
  return (
    shippingOption.service_zone?.fulfillment_set?.location?.id === locationId
  )
}

function isShippingOptionCompatible(
  items: FulfillmentLineItem[],
  shippingOption: FulfillmentShippingOption
): boolean {
  return items.every((item) => matchesShippingProfile(item, shippingOption))
}

function getCompatibleShippingOptions(
  shippingOptions: FulfillmentShippingOption[],
  items: FulfillmentLineItem[]
): FulfillmentShippingOption[] {
  return shippingOptions.filter((shippingOption) =>
    isShippingOptionCompatible(items, shippingOption)
  )
}

function toSafeQuantity(value: unknown): number {
  const quantity = Number(unwrapQuantity(value))

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order contains an invalid fulfillment quantity"
    )
  }

  return quantity
}

function unwrapQuantity(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value
  }

  const quantityRecord = value as Record<string, unknown>

  if ("value" in quantityRecord) {
    return unwrapQuantity(quantityRecord.value)
  }

  const primitiveValue = value.valueOf()

  return primitiveValue === value ? value : unwrapQuantity(primitiveValue)
}

function isString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0
}
