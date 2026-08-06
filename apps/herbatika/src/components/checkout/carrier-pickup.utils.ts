import type { HerbatikaLocale } from "@/lib/storefront/market-context"

const normalizeIdentifier = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

type CarrierPickupType = "gls" | "packeta" | "ppl"

export type CarrierPickupFailureReason =
  | "point_unavailable"
  | "selection_failed"
  | "selector_unavailable"

type CarrierPickupWidgetLanguage = "cs" | "hu" | "ro" | "sk"

export interface CarrierPickupRequirement {
  carrier: CarrierPickupType
}

export interface ShippingOptionWithPickupData {
  data?: Record<string, unknown> | null
  id: string
  name?: string | null
  provider_id?: string | null
}

const GLS_CODES = new Set(["parcelshop", "parcelshop_cod"])
const PACKETA_CODES = new Set(["z_point", "z_point_cod"])
const PPL_PICKUP_PRODUCTS = new Set(["smad", "smar"])
const CARRIER_PICKUP_WIDGET_LANGUAGES = {
  "cs-CZ": "cs",
  "hu-HU": "hu",
  "ro-RO": "ro",
  "sk-SK": "sk",
} as const satisfies Record<HerbatikaLocale, CarrierPickupWidgetLanguage>

export const CARRIER_PICKUP_FAILURE_KEYS = {
  point_unavailable: "pickup_point_unavailable",
  selection_failed: "pickup_selection_failed",
  selector_unavailable: "pickup_selector_unavailable",
} as const satisfies Record<CarrierPickupFailureReason, string>

export const resolveCarrierPickupRequirement = (
  option: ShippingOptionWithPickupData,
): CarrierPickupRequirement | null => {
  const optionData = option.data ?? {}
  const optionCode = normalizeIdentifier(Reflect.get(optionData, "code"))
  const productType = normalizeIdentifier(
    Reflect.get(optionData, "product_type"),
  )
  const providerId = normalizeIdentifier(option.provider_id)
  const optionName = normalizeIdentifier(option.name)
  const pickupOptionMarkers = [
    "pickup",
    "parcel",
    "parcelshop",
    "výdaj",
    "vyzdvih",
    "z-point",
    "zásielkov",
  ]
  const looksLikePickupOption = pickupOptionMarkers.some((marker) =>
    optionName.includes(marker),
  )

  if (
    providerId.includes("gls") &&
    (GLS_CODES.has(optionCode) || looksLikePickupOption)
  ) {
    return { carrier: "gls" }
  }

  if (
    PACKETA_CODES.has(optionCode) ||
    (providerId.includes("packeta") && looksLikePickupOption)
  ) {
    return { carrier: "packeta" }
  }

  if (
    Reflect.get(optionData, "requires_access_point") === true ||
    PPL_PICKUP_PRODUCTS.has(productType) ||
    (providerId.includes("ppl") && looksLikePickupOption)
  ) {
    return { carrier: "ppl" }
  }

  return null
}

export const resolveCarrierPickupWidgetLanguage = (locale: HerbatikaLocale) =>
  CARRIER_PICKUP_WIDGET_LANGUAGES[locale]
