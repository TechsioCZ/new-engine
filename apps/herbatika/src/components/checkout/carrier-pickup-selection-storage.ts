"use client"

export interface StoredCarrierPickupSelection {
  data: Record<string, unknown>
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

const hasAccessPointId = (
  data: Record<string, unknown> | null | undefined,
): data is Record<string, unknown> => {
  const accessPointId: unknown =
    data === null || data === undefined
      ? undefined
      : Reflect.get(data, "access_point_id")
  return typeof accessPointId === "string"
    ? accessPointId.trim().length > 0
    : typeof accessPointId === "number" && Number.isFinite(accessPointId)
}

const isStoredCarrierPickupSelection = (
  value: unknown,
): value is StoredCarrierPickupSelection => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const hasOptionId =
    "optionId" in value &&
    typeof value.optionId === "string" &&
    value.optionId.trim().length > 0
  const hasData =
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    !Array.isArray(value.data)

  return hasOptionId && hasData
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

    if (!isStoredCarrierPickupSelection(parsedValue)) {
      return null
    }

    return parsedValue.optionId === optionId ? parsedValue : null
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
  data?: Record<string, unknown>
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

  if (!hasAccessPointId(data)) {
    clearStoredCarrierPickupSelection(cartId)
    return
  }

  window.sessionStorage.setItem(
    createStorageKey(cartId),
    JSON.stringify({ data, optionId }),
  )
}
