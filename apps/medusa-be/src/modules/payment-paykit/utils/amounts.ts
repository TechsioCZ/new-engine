import { BigNumber, MathBN, MedusaError } from "@medusajs/framework/utils"

interface PaymentAmountValue {
  readonly value: unknown
}

const hasOwnPaymentAmountValue = (
  value: unknown,
): value is PaymentAmountValue =>
  typeof value === "object" && value !== null && Object.hasOwn(value, "value")

const invalidPaymentAmount = (
  message: string,
  invalidDataType: typeof MedusaError.Types.INVALID_DATA,
): MedusaError => new MedusaError(invalidDataType, message)

export const toNumericPaymentAmount = (
  value: unknown,
  message: string,
  invalidDataType: typeof MedusaError.Types.INVALID_DATA = MedusaError.Types
    .INVALID_DATA,
): number => {
  let normalized: number

  try {
    normalized = Number(hasOwnPaymentAmountValue(value) ? value.value : value)
  } catch {
    throw invalidPaymentAmount(message, invalidDataType)
  }

  if (!Number.isFinite(normalized)) {
    throw invalidPaymentAmount(message, invalidDataType)
  }

  return normalized
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
])

const STRIPE_THREE_DECIMAL_CURRENCIES = new Set([
  "bhd",
  "iqd",
  "jod",
  "kwd",
  "omr",
  "tnd",
])

const getNormalizedCurrency = (currencyCode?: string): string =>
  currencyCode?.toLowerCase() ?? ""

const roundToSmallestCurrencyUnit = (
  amount: number,
  multiplier: number,
): number => {
  const roundedMajor =
    Math.round(new BigNumber(MathBN.mult(amount, multiplier)).numeric) /
    multiplier
  const smallestAmount = new BigNumber(MathBN.mult(roundedMajor, multiplier))

  return Math.trunc(smallestAmount.numeric)
}

export const getCurrencyMultiplier = (currencyCode?: string): number => {
  const normalizedCurrency = currencyCode?.toLowerCase() ?? ""

  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return 1
  }

  return 100
}

export const getStripeCurrencyMultiplier = (currencyCode?: string): number => {
  const normalizedCurrency = getNormalizedCurrency(currencyCode)

  if (
    ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) &&
    normalizedCurrency !== "ugx"
  ) {
    return 1
  }

  if (STRIPE_THREE_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return 1000
  }

  return 100
}

export const toSmallestCurrencyUnit = (
  amount: number,
  currencyCode?: string,
): number =>
  roundToSmallestCurrencyUnit(amount, getCurrencyMultiplier(currencyCode))

export const fromSmallestCurrencyUnit = (
  amount: number,
  currencyCode?: string,
): number => amount / getCurrencyMultiplier(currencyCode)

export const fromStripeSmallestCurrencyUnit = (
  amount: number,
  currencyCode?: string,
): number => amount / getStripeCurrencyMultiplier(currencyCode)

export const toStripeSmallestCurrencyUnit = (
  amount: number,
  currencyCode?: string,
): number => {
  const multiplier = getStripeCurrencyMultiplier(currencyCode)
  const smallestUnitAmount = roundToSmallestCurrencyUnit(amount, multiplier)

  return multiplier === 1000
    ? Math.ceil(smallestUnitAmount / 10) * 10
    : Math.trunc(smallestUnitAmount)
}
