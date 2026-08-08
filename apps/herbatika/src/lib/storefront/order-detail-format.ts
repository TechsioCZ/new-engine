import type { HttpTypes } from "@medusajs/types"
import { getRecordValue, isRecord } from "@techsio/std/object"

import {
  readFromRecord,
  readString,
  toAddressSummary,
} from "./order-address-format"

const readMethodLabel = (candidate: unknown) => {
  if (!isRecord(candidate)) {
    return null
  }

  const directLabel = readFromRecord(candidate, [
    "name",
    "label",
    "provider_id",
    "providerId",
    "id",
  ])
  if ((directLabel ?? "").length > 0) {
    return directLabel
  }

  const nestedCandidates = [
    getRecordValue(candidate, "option"),
    getRecordValue(candidate, "shipping_option"),
    getRecordValue(candidate, "shippingOption"),
    getRecordValue(candidate, "provider"),
    getRecordValue(candidate, "payment_provider"),
    getRecordValue(candidate, "paymentProvider"),
  ]

  for (const nestedCandidate of nestedCandidates) {
    if (!isRecord(nestedCandidate)) {
      continue
    }

    const nestedLabel = readFromRecord(nestedCandidate, [
      "name",
      "label",
      "provider_id",
      "providerId",
      "id",
    ])

    if ((nestedLabel ?? "").length > 0) {
      return nestedLabel
    }
  }

  return null
}

const readMetadataValue = (metadata: unknown, keys: string[]) => {
  if (!isRecord(metadata)) {
    return null
  }

  return readFromRecord(metadata, keys)
}

export const resolveOrderContactEmail = (
  order: HttpTypes.StoreOrder,
  fallbackEmail?: string | null,
) => readString(order.email) ?? readString(fallbackEmail) ?? "-"

export const resolveOrderAddresses = (order: HttpTypes.StoreOrder) => ({
  billing: toAddressSummary(
    (order as { billing_address?: unknown }).billing_address,
  ),
  shipping: toAddressSummary(
    (order as { shipping_address?: unknown }).shipping_address,
  ),
})

export const resolveOrderShippingMethodLabel = (
  order: HttpTypes.StoreOrder,
) => {
  const shippingMethods = (order as { shipping_methods?: unknown })
    .shipping_methods
  if (!Array.isArray(shippingMethods) || shippingMethods.length === 0) {
    return null
  }

  return readMethodLabel(shippingMethods[0])
}

export const resolveOrderPaymentMethodLabel = (order: HttpTypes.StoreOrder) => {
  const { transactions } = order as { transactions?: unknown }
  if (Array.isArray(transactions) && transactions.length > 0) {
    const transactionLabel = readMethodLabel(transactions[0])
    if ((transactionLabel ?? "").length > 0) {
      return transactionLabel
    }
  }

  const paymentCollections = (order as { payment_collections?: unknown })
    .payment_collections
  if (Array.isArray(paymentCollections) && paymentCollections.length > 0) {
    const paymentCollectionLabel = readMethodLabel(paymentCollections[0])
    if ((paymentCollectionLabel ?? "").length > 0) {
      return paymentCollectionLabel
    }
  }

  return null
}

export const resolveOrderTrackingCode = (order: HttpTypes.StoreOrder) =>
  readMetadataValue((order as { metadata?: unknown }).metadata, [
    "tracking_number",
    "trackingNumber",
    "shipment_tracking",
    "shipmentTracking",
    "tracking_code",
    "trackingCode",
  ])
