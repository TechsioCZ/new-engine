import { isRecord } from "@techsio/std/object"

type OrderRecord = Record<string, unknown>

interface OrderAddressSummary {
  fullName: string | null
  company: string | null
  lines: string[]
}

export const readString = (value: unknown) => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const readFromRecord = (record: OrderRecord, keys: string[]) => {
  for (const key of keys) {
    const value = readString(record[key])
    if (value !== null) {
      return value
    }
  }

  return null
}

const formatCountry = (value: string | null) => {
  if (value === null) {
    return null
  }

  return value.length === 2 ? value.toUpperCase() : value
}

export const toAddressSummary = (
  value: unknown,
): OrderAddressSummary | null => {
  if (!isRecord(value)) {
    return null
  }

  const firstName = readFromRecord(value, ["first_name", "firstName"])
  const lastName = readFromRecord(value, ["last_name", "lastName"])
  const company = readFromRecord(value, ["company"])
  const address1 = readFromRecord(value, ["address_1", "address1"])
  const address2 = readFromRecord(value, ["address_2", "address2"])
  const city = readFromRecord(value, ["city", "town"])
  const postalCode = readFromRecord(value, ["postal_code", "postalCode", "zip"])
  const province = readFromRecord(value, ["province", "state"])
  const countryCode = formatCountry(
    readFromRecord(value, ["country_code", "countryCode", "country"]),
  )
  const phone = readFromRecord(value, ["phone"])

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || null
  const cityLine = [postalCode, city].filter(Boolean).join(" ").trim() || null

  const lines = [
    address1,
    address2,
    cityLine,
    province,
    countryCode,
    phone,
  ].filter((line): line is string => Boolean(line))

  const hasRecipient = (fullName ?? "").length > 0 || (company ?? "").length > 0
  if (!hasRecipient && lines.length === 0) {
    return null
  }

  return {
    company,
    fullName,
    lines,
  }
}
