export type CanonicalPriceAmount = string

const CANONICAL_MAJOR_UNIT_AMOUNT = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/
const MAX_SAFE_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER)

export const canonicalPriceAmount = (
  value: unknown,
  label: string
): CanonicalPriceAmount => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite major-unit amount`)
  }

  const amount = String(value)
  if (!CANONICAL_MAJOR_UNIT_AMOUNT.test(amount)) {
    throw new Error(
      `${label} must have at most two decimal places without exponent notation`
    )
  }

  const [majorUnits, fraction = ""] = amount.split(".")
  const minorUnits = BigInt(`${majorUnits}${fraction.padEnd(2, "0")}`)
  if (minorUnits > MAX_SAFE_MINOR_UNITS) {
    throw new Error(`${label} exceeds the safe two-decimal major-unit range`)
  }
  return amount
}

export const isPositiveCanonicalPriceAmount = (
  value: unknown
): value is CanonicalPriceAmount => {
  if (typeof value !== "string" || !CANONICAL_MAJOR_UNIT_AMOUNT.test(value)) {
    return false
  }
  const [majorUnits, fraction = ""] = value.split(".")
  const minorUnits = BigInt(`${majorUnits}${fraction.padEnd(2, "0")}`)
  return minorUnits > 0n && minorUnits <= MAX_SAFE_MINOR_UNITS
}
