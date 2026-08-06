import { isRecord } from "@techsio/std/object"

import type {
  CheckoutAddressValues,
  CheckoutDetailsValues,
} from "@/lib/forms/checkout/address.form"

type CheckoutTogglePreferences = Pick<
  CheckoutDetailsValues,
  "isCompanyPurchase" | "useSameAddress"
>

const LOCAL_ONLY_ADDRESS_FIELDS = [
  "companyId",
  "customerNote",
  "taxId",
  "vatId",
] as const satisfies readonly (keyof CheckoutAddressValues)[]

type LocalOnlyAddressField = (typeof LOCAL_ONLY_ADDRESS_FIELDS)[number]
type CheckoutLocalOnlyAddressValues = Record<LocalOnlyAddressField, string>
export type CheckoutStoredState = Partial<CheckoutTogglePreferences> & {
  billing?: CheckoutLocalOnlyAddressValues
  shipping?: CheckoutLocalOnlyAddressValues
}

const createEmptyCheckoutLocalOnlyAddressValues =
  (): CheckoutLocalOnlyAddressValues => ({
    companyId: "",
    customerNote: "",
    taxId: "",
    vatId: "",
  })

export const pickCheckoutLocalOnlyAddressValues = (
  address: CheckoutAddressValues,
): CheckoutLocalOnlyAddressValues => {
  const nextValues = createEmptyCheckoutLocalOnlyAddressValues()

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    nextValues[field] = address[field].trim()
  }

  return nextValues
}

const normalizeStoredAddressValues = (
  value: unknown,
): CheckoutLocalOnlyAddressValues | null => {
  if (!isRecord(value)) {
    return null
  }

  const nextValues = createEmptyCheckoutLocalOnlyAddressValues()

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    const fieldValue: unknown = Reflect.get(value, field)

    if (typeof fieldValue === "string") {
      nextValues[field] = fieldValue
    }
  }

  return nextValues
}

export const overlayStoredAddressValues = ({
  address,
  storedAddress,
}: {
  address: CheckoutAddressValues
  storedAddress?: CheckoutLocalOnlyAddressValues
}): CheckoutAddressValues => {
  if (!storedAddress) {
    return address
  }

  const nextAddress = { ...address }

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    if (nextAddress[field].trim().length > 0) {
      continue
    }

    if (storedAddress[field].trim().length > 0) {
      nextAddress[field] = storedAddress[field]
    }
  }

  return nextAddress
}

export const createCheckoutToggleStorageKey = (cartId?: string | null) =>
  cartId !== undefined && cartId !== null && cartId.length > 0
    ? `herbatika.checkout-details.${cartId}`
    : null

export const readStoredCheckoutState = (
  storageKey: string | null,
): CheckoutStoredState => {
  if (storageKey === null || typeof window === "undefined") {
    return {}
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey)

    if (rawValue === null || rawValue.length === 0) {
      return {}
    }

    const parsedValue: unknown = JSON.parse(rawValue)

    if (!isRecord(parsedValue)) {
      return {}
    }

    const storedRecord: Partial<Record<keyof CheckoutStoredState, unknown>> =
      parsedValue
    const billing = normalizeStoredAddressValues(storedRecord.billing)
    const shipping = normalizeStoredAddressValues(storedRecord.shipping)

    return {
      ...(billing === null ? {} : { billing }),
      ...(typeof storedRecord.isCompanyPurchase === "boolean"
        ? { isCompanyPurchase: storedRecord.isCompanyPurchase }
        : {}),
      ...(shipping === null ? {} : { shipping }),
      ...(typeof storedRecord.useSameAddress === "boolean"
        ? { useSameAddress: storedRecord.useSameAddress }
        : {}),
    }
  } catch {
    return {}
  }
}

export const writeStoredCheckoutState = ({
  nextState,
  storageKey,
}: {
  nextState: CheckoutStoredState
  storageKey: string | null
}) => {
  if (storageKey === null || typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(nextState))
}
