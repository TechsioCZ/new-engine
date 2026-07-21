import type { HerbatikaLocale } from "@/lib/storefront/market-context"

export type CarrierPickupType = "packeta" | "ppl"

export type CarrierPickupFailureReason =
  | "point_unavailable"
  | "selection_failed"
  | "selector_unavailable"

export type CarrierPickupWidgetLanguage = "cs" | "hu" | "ro" | "sk"

export type CarrierPickupRequirement = {
  carrier: CarrierPickupType
}

export type ShippingOptionWithPickupData = {
  data?: Record<string, unknown> | null
  id: string
  name?: string | null
  provider_id?: string | null
}

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

export function resolveCarrierPickupRequirement(
  option: ShippingOptionWithPickupData
): CarrierPickupRequirement | null {
  const optionData = option.data ?? {}
  const optionCode = normalizeIdentifier(optionData.code)
  const productType = normalizeIdentifier(optionData.product_type)
  const providerId = normalizeIdentifier(option.provider_id)
  const optionName = normalizeIdentifier(option.name)
  const looksLikePickupOption =
    optionName.includes("pickup") ||
    optionName.includes("parcel") ||
    optionName.includes("výdaj") ||
    optionName.includes("vyzdvih") ||
    optionName.includes("z-point") ||
    optionName.includes("zásielkov")

  if (
    PACKETA_CODES.has(optionCode) ||
    (providerId.includes("packeta") && looksLikePickupOption)
  ) {
    return { carrier: "packeta" }
  }

  if (
    optionData.requires_access_point === true ||
    PPL_PICKUP_PRODUCTS.has(productType) ||
    (providerId.includes("ppl") && looksLikePickupOption)
  ) {
    return { carrier: "ppl" }
  }

  return null
}

export const resolveCarrierPickupWidgetLanguage = (locale: HerbatikaLocale) =>
  CARRIER_PICKUP_WIDGET_LANGUAGES[locale]

function normalizeIdentifier(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}
