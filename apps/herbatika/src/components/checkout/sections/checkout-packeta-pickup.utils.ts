import type { PacketaPickupPoint } from "../packeta-widget.types"

const DEFAULT_PACKETA_COUNTRY = "sk"

export const resolvePacketaPointLabel = (
  point: PacketaPickupPoint,
  fallbackPointLabel: string,
) => point.place ?? point.name ?? point.id ?? fallbackPointLabel

export const buildPacketaShippingData = (
  point: PacketaPickupPoint,
  fallbackPointLabel: string,
) => {
  const payload: Record<string, unknown> = {
    access_point_city: point.city,
    access_point_country: point.country,
    access_point_id: point.id,
    access_point_name: resolvePacketaPointLabel(point, fallbackPointLabel),
    access_point_street: point.street,
    access_point_type: point.pickupPointType ?? point.group,
    access_point_zip: point.zip,
  }

  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== null && value !== "",
    ),
  )
}

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
