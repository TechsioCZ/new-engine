import { omitUndefined } from "@techsio/std/object"

import type { CarrierPickupData } from "../carrier-pickup.utils"
import type { PacketaPickupPoint } from "../packeta-widget.types"

const DEFAULT_PACKETA_COUNTRY = "sk"

export const resolvePacketaPointLabel = (
  point: PacketaPickupPoint,
  fallbackPointLabel: string,
) => point.place ?? point.name ?? point.id ?? fallbackPointLabel

const excludeEmptyPickupText = (value: string | null | undefined) =>
  value === null || value === "" ? undefined : value

export const buildPacketaShippingData = (
  point: PacketaPickupPoint,
  fallbackPointLabel: string,
): CarrierPickupData =>
  omitUndefined({
    access_point_city: excludeEmptyPickupText(point.city),
    access_point_country: excludeEmptyPickupText(point.country),
    access_point_id: excludeEmptyPickupText(point.id),
    access_point_name: excludeEmptyPickupText(
      resolvePacketaPointLabel(point, fallbackPointLabel),
    ),
    access_point_street: excludeEmptyPickupText(point.street),
    access_point_type: excludeEmptyPickupText(
      point.pickupPointType ?? point.group,
    ),
    access_point_zip: excludeEmptyPickupText(point.zip),
  })

const resolvePacketaCountries = (value: string) => {
  const countries = value
    .split(",")
    .map((country) => country.trim().toLowerCase())
    .filter(Boolean)

  return countries.length > 0 ? countries : [DEFAULT_PACKETA_COUNTRY]
}

export const formatPacketaAddress = (point: PacketaPickupPoint) => {
  const addressParts = [point.street, point.zip, point.city].filter(Boolean)

  return addressParts.length > 0 ? addressParts.join(", ") : null
}

const {
  NEXT_PUBLIC_PACKETA_WIDGET_API_KEY,
  NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES,
} = process.env
export const PACKETA_WIDGET_API_KEY =
  NEXT_PUBLIC_PACKETA_WIDGET_API_KEY?.trim() ?? ""
const PACKETA_WIDGET_COUNTRIES =
  NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES?.trim() ?? DEFAULT_PACKETA_COUNTRY
export const ENABLED_PACKETA_COUNTRIES = resolvePacketaCountries(
  PACKETA_WIDGET_COUNTRIES,
)
