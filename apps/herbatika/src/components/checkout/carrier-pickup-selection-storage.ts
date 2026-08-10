"use client"

import { getRecordValue, isRecord } from "@techsio/std/object"

import type {
  CarrierPickupData,
  StoredCarrierPickupData,
} from "./carrier-pickup.utils"

export interface StoredCarrierPickupSelection {
  data: StoredCarrierPickupData
  optionId: string
}

const STORAGE_PREFIX = "herbatika.carrier-pickup"
const createStorageKey = (cartId: string) => `${STORAGE_PREFIX}.${cartId}`

export const clearStoredCarrierPickupSelection = (cartId?: string | null) => {
  if (
    cartId === undefined ||
    cartId === null ||
    cartId.length === 0 ||
    typeof window === "undefined"
  ) {
    return
  }

  window.sessionStorage.removeItem(createStorageKey(cartId))
}

const isCarrierPickupText = (
  value: unknown,
): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string"

const decodeCarrierPickupData = (
  value: unknown,
): StoredCarrierPickupData | null => {
  if (!isRecord(value)) {
    return null
  }

  const accessPointId = getRecordValue(value, "access_point_id")
  if (
    !(
      (typeof accessPointId === "string" && accessPointId.trim().length > 0) ||
      (typeof accessPointId === "number" && Number.isFinite(accessPointId))
    )
  ) {
    return null
  }
  const textValues = [
    getRecordValue(value, "access_point_city"),
    getRecordValue(value, "access_point_country"),
    getRecordValue(value, "access_point_name"),
    getRecordValue(value, "access_point_street"),
    getRecordValue(value, "access_point_type"),
    getRecordValue(value, "access_point_zip"),
  ]
  if (!textValues.every(isCarrierPickupText)) {
    return null
  }
  const [city, country, name, street, type, zip] = textValues

  return {
    access_point_id: accessPointId,
    ...(city === undefined ? {} : { access_point_city: city }),
    ...(country === undefined ? {} : { access_point_country: country }),
    ...(name === undefined ? {} : { access_point_name: name }),
    ...(street === undefined ? {} : { access_point_street: street }),
    ...(type === undefined ? {} : { access_point_type: type }),
    ...(zip === undefined ? {} : { access_point_zip: zip }),
  }
}

const decodeStoredCarrierPickupSelection = (
  value: unknown,
): StoredCarrierPickupSelection | null => {
  if (!isRecord(value)) {
    return null
  }
  const optionId: unknown = getRecordValue(value, "optionId")
  const data = decodeCarrierPickupData(getRecordValue(value, "data"))
  return typeof optionId === "string" &&
    optionId.trim().length > 0 &&
    data !== null
    ? { data, optionId }
    : null
}

export const readStoredCarrierPickupSelection = ({
  cartId,
  optionId,
}: {
  cartId?: string | null
  optionId?: string | null
}): StoredCarrierPickupSelection | null => {
  const hasCartId = cartId !== undefined && cartId !== null && cartId.length > 0
  const hasOptionId =
    optionId !== undefined && optionId !== null && optionId.length > 0
  if (!(hasCartId && hasOptionId) || typeof window === "undefined") {
    return null
  }

  try {
    const rawValue = window.sessionStorage.getItem(createStorageKey(cartId))

    if (rawValue === null || rawValue.length === 0) {
      return null
    }

    const parsedValue: unknown = JSON.parse(rawValue)

    const selection = decodeStoredCarrierPickupSelection(parsedValue)
    return selection?.optionId === optionId ? selection : null
  } catch {
    return null
  }
}

export const writeStoredCarrierPickupSelection = ({
  cartId,
  data,
  optionId,
}: {
  cartId?: string | null
  data?: CarrierPickupData
  optionId: string
}) => {
  if (
    cartId === undefined ||
    cartId === null ||
    cartId.length === 0 ||
    typeof window === "undefined"
  ) {
    return
  }

  const decodedData = decodeCarrierPickupData(data)
  if (decodedData === null) {
    clearStoredCarrierPickupSelection(cartId)
    return
  }

  window.sessionStorage.setItem(
    createStorageKey(cartId),
    JSON.stringify({ data: decodedData, optionId }),
  )
}
