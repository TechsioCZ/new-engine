import { isRecord } from "@techsio/std/object"

export const asStorefrontRecord = (
  value: unknown
): Record<string, unknown> | null => (isRecord(value) ? value : null)

export const asStorefrontString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export const asStorefrontNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim().replace(",", ".")
  if (!normalized) {
    return null
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export const asStorefrontBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value
  }
  if (typeof value === "number") {
    return value === 1 ? true : value === 0 ? false : null
  }
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim().toLowerCase()
  if (["1", "true", "yes"].includes(normalized)) {
    return true
  }
  if (["0", "false", "no"].includes(normalized)) {
    return false
  }
  return null
}

export const resolveAmountWithoutTax = (params: {
  amountWithTax: number | null
  amountWithoutTax: number | null
  vatRate: number | null
}): number | null => {
  const { amountWithTax, amountWithoutTax, vatRate } = params
  if (
    typeof amountWithoutTax === "number" &&
    amountWithoutTax > 0 &&
    (typeof amountWithTax !== "number" || amountWithoutTax <= amountWithTax)
  ) {
    return amountWithoutTax
  }
  if (
    typeof amountWithTax === "number" &&
    typeof vatRate === "number" &&
    vatRate > 0
  ) {
    return amountWithTax / (1 + vatRate / 100)
  }
  return null
}
