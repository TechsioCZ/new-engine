import { createHash } from "node:crypto"
import type { FulfillmentItemDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  GLSEnvironment,
  GLSPacketAttributes,
} from "../../gls-client/types"
import type { QueryService } from "./packet-attributes"

type FulfillmentOperation = {
  environment: GLSEnvironment
  orderId: string
  items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
  attributes: GLSPacketAttributes
}

type FulfillmentOperationIdentity = {
  operationKey: string
  clientReference: string
}

type NormalizedItem = {
  lineItemId: string
  quantity: string
}

type OrderFulfillmentRecord = {
  fulfillments?: Array<{ id?: string | null }> | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isOptionalString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string"

const isFulfillmentRecord = (value: unknown): value is { id?: string | null } =>
  isRecord(value) && isOptionalString(value.id)

const isOrderFulfillmentRecord = (
  value: unknown
): value is OrderFulfillmentRecord => {
  if (!isRecord(value)) {
    return false
  }

  const fulfillments: unknown = value.fulfillments
  return (
    fulfillments === undefined ||
    fulfillments === null ||
    (Array.isArray(fulfillments) && fulfillments.every(isFulfillmentRecord))
  )
}

export function buildGLSFulfillmentOperationIdentity(
  input: FulfillmentOperation
): FulfillmentOperationIdentity {
  const normalizedItems = input.items
    .map(normalizeFulfillmentItem)
    .sort((left, right) => left.lineItemId.localeCompare(right.lineItemId))
  const accessPointId =
    typeof input.attributes.addressId === "string"
      ? input.attributes.addressId.trim() || null
      : null
  const currency =
    typeof input.attributes.currency === "string"
      ? input.attributes.currency.trim().toUpperCase() || null
      : null
  const payload = JSON.stringify({
    environment: input.environment,
    orderId: input.orderId,
    items: normalizedItems,
    accessPointId,
    cashOnDelivery: input.attributes.cod !== undefined,
    currency,
  })
  const digest = createHash("sha256").update(payload).digest("hex")

  return {
    operationKey: digest,
    clientReference: "NE-".concat(digest.slice(0, 32)),
  }
}

export async function resolveOrderFulfillmentIds(
  query: QueryService,
  orderId: string
): Promise<string[]> {
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "fulfillments.id"],
    filters: { id: orderId },
    pagination: { take: 1 },
  })
  const order: unknown = data[0]

  if (!isOrderFulfillmentRecord(order)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "GLS: Order was not found while preparing fulfillment"
    )
  }

  return [
    ...new Set(
      (order.fulfillments ?? [])
        .map((fulfillment) => fulfillment.id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]
}

function normalizeFulfillmentItem(
  item: Partial<Omit<FulfillmentItemDTO, "fulfillment">>
): NormalizedItem {
  const lineItemId =
    typeof item.line_item_id === "string" ? item.line_item_id.trim() : ""
  const quantity = String(item.quantity ?? "").trim()

  if (!lineItemId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Every fulfillment item requires line_item_id and quantity"
    )
  }
  if (!quantity) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Every fulfillment item requires line_item_id and quantity"
    )
  }

  return { lineItemId, quantity }
}
