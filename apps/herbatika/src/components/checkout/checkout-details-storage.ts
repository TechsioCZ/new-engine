import { isRecord } from "@techsio/std/object"

import {
  type CheckoutAddressDetailsValues,
  type CheckoutAddressValues,
  type CheckoutDetailsValues,
  resolveEffectiveCheckoutAddressDetails,
} from "@/lib/forms/checkout/address.form"

const LOCAL_ONLY_ADDRESS_FIELDS = [
  "companyId",
  "customerNote",
  "taxId",
  "vatId",
] as const satisfies ReadonlyArray<keyof CheckoutAddressValues>

type LocalOnlyAddressField = (typeof LOCAL_ONLY_ADDRESS_FIELDS)[number]
type CheckoutLocalOnlyAddressValues = Record<LocalOnlyAddressField, string>
type CheckoutTogglePreferences = Pick<
  CheckoutDetailsValues,
  "isCompanyPurchase" | "useSameAddress"
>
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

const pickCheckoutLocalOnlyAddressValues = (
  address: CheckoutAddressValues
): CheckoutLocalOnlyAddressValues => {
  const nextValues = createEmptyCheckoutLocalOnlyAddressValues()

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    nextValues[field] = address[field].trim()
  }

  return nextValues
}

const normalizeStoredAddressValues = (
  value: unknown
): CheckoutLocalOnlyAddressValues | undefined => {
  if (!isRecord(value)) {
    return
  }

  const nextValues = createEmptyCheckoutLocalOnlyAddressValues()

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    const fieldValue = value[field]

    if (typeof fieldValue === "string") {
      nextValues[field] = fieldValue
    }
  }

  return nextValues
}

const overlayStoredAddressValues = ({
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

export const createCheckoutStorageKey = (cartId?: string | null) =>
  cartId ? `herbatika.checkout-details.${cartId}` : null

export const readStoredCheckoutState = (
  storageKey: string | null
): CheckoutStoredState => {
  if (!storageKey || typeof window === "undefined") {
    return {}
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey)

    if (!rawValue) {
      return {}
    }

    const parsedState: unknown = JSON.parse(rawValue)
    if (!isRecord(parsedState)) {
      return {}
    }

    const billing = normalizeStoredAddressValues(parsedState["billing"])
    const shipping = normalizeStoredAddressValues(parsedState["shipping"])
    return {
      ...(billing === undefined ? {} : { billing }),
      ...(typeof parsedState["isCompanyPurchase"] === "boolean"
        ? { isCompanyPurchase: parsedState["isCompanyPurchase"] }
        : {}),
      ...(shipping === undefined ? {} : { shipping }),
      ...(typeof parsedState["useSameAddress"] === "boolean"
        ? { useSameAddress: parsedState["useSameAddress"] }
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
  if (!storageKey || typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(nextState))
}

const resolveNextStoredCheckoutState = ({
  currentState,
  nextValues,
}: {
  currentState: CheckoutStoredState
  nextValues: Partial<CheckoutAddressDetailsValues>
}): CheckoutStoredState => {
  const effectiveValues =
    nextValues.billing && nextValues.shipping
      ? resolveEffectiveCheckoutAddressDetails({
          billing: nextValues.billing,
          isCompanyPurchase:
            nextValues.isCompanyPurchase ??
            currentState.isCompanyPurchase ??
            false,
          shipping: nextValues.shipping,
          useSameAddress:
            nextValues.useSameAddress ?? currentState.useSameAddress ?? true,
        })
      : undefined

  return {
    ...currentState,
    ...(typeof nextValues.isCompanyPurchase === "boolean"
      ? { isCompanyPurchase: nextValues.isCompanyPurchase }
      : {}),
    ...(typeof nextValues.useSameAddress === "boolean"
      ? { useSameAddress: nextValues.useSameAddress }
      : {}),
    ...(effectiveValues
      ? {
          billing: pickCheckoutLocalOnlyAddressValues(effectiveValues.billing),
          shipping: pickCheckoutLocalOnlyAddressValues(
            effectiveValues.shipping
          ),
        }
      : {}),
  }
}

export const resolveStoredCheckoutTogglePreferences = ({
  currentPreferences,
  nextIsCompanyPurchase,
  nextUseSameAddress,
}: {
  currentPreferences: CheckoutStoredState
  nextIsCompanyPurchase?: boolean
  nextUseSameAddress?: boolean
}) =>
  resolveNextStoredCheckoutState({
    currentState: currentPreferences,
    nextValues: {
      ...(typeof nextIsCompanyPurchase === "boolean"
        ? { isCompanyPurchase: nextIsCompanyPurchase }
        : {}),
      ...(typeof nextUseSameAddress === "boolean"
        ? { useSameAddress: nextUseSameAddress }
        : {}),
    },
  })

export const resolveStoredCheckoutStateFromValues = ({
  currentState,
  values,
}: {
  currentState: CheckoutStoredState
  values: CheckoutDetailsValues
}) =>
  resolveNextStoredCheckoutState({
    currentState,
    nextValues: values,
  })

export const resolveHydratedValuesWithStoredState = ({
  hydratedValues,
  storedState,
}: {
  hydratedValues: CheckoutDetailsValues
  storedState: CheckoutStoredState
}): CheckoutDetailsValues => {
  const valuesWithLocalFields = {
    ...hydratedValues,
    billing: overlayStoredAddressValues({
      address: hydratedValues.billing,
      ...(storedState.billing === undefined
        ? {}
        : { storedAddress: storedState.billing }),
    }),
    shipping: overlayStoredAddressValues({
      address: hydratedValues.shipping,
      ...(storedState.shipping === undefined
        ? {}
        : { storedAddress: storedState.shipping }),
    }),
  }

  return {
    ...valuesWithLocalFields,
    isCompanyPurchase:
      typeof storedState.isCompanyPurchase === "boolean"
        ? storedState.isCompanyPurchase
        : hydratedValues.isCompanyPurchase,
    useSameAddress:
      typeof storedState.useSameAddress === "boolean"
        ? storedState.useSameAddress
        : hydratedValues.useSameAddress,
  }
}
