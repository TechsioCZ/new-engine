export type CarrierPickupType = "packeta" | "ppl"

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

export function resolveCarrierPickupHint(
  requirement: CarrierPickupRequirement
) {
  return requirement.carrier === "packeta" ? "Packeta výdaj" : "PPL výdaj"
}

function normalizeIdentifier(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}
