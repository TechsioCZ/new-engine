import { DEFAULT_CURRENCY_CODE } from "./currency"

const normalizeFormatCurrencyCode = (currencyCode?: string | null): string => {
  if (typeof currencyCode !== "string") {
    return DEFAULT_CURRENCY_CODE
  }

  const normalizedCode = currencyCode.trim().toUpperCase()
  if (normalizedCode.length !== 3) {
    return DEFAULT_CURRENCY_CODE
  }

  return normalizedCode
}

const resolveLocaleFromCurrency = (currencyCode: string) => {
  const localeByCurrency: Record<string, string> = {
    CZK: "cs-CZ",
    HUF: "hu-HU",
    RON: "ro-RO",
  }

  return localeByCurrency[currencyCode] ?? "sk-SK"
}

// Only used when Intl rejects the currency code; keeps the fallback string in
// the same market vocabulary the Intl path renders.
const FALLBACK_CURRENCY_SYMBOLS: Record<string, string> = {
  CZK: "Kč",
  EUR: "€",
  HUF: "Ft",
  RON: "lei",
}

const resolveFallbackCurrencySymbol = (currencyCode: string) =>
  FALLBACK_CURRENCY_SYMBOLS[currencyCode] ?? currencyCode

type FormatCurrencyAmountOptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  fallbackPrecision?: number
}

export const formatCurrencyAmount = (
  amount: number,
  currencyCode?: string | null,
  options: FormatCurrencyAmountOptions = {}
): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const safeCurrencyCode = normalizeFormatCurrencyCode(currencyCode)
  const minimumFractionDigits =
    typeof options.minimumFractionDigits === "number"
      ? options.minimumFractionDigits
      : 2
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === "number"
      ? options.maximumFractionDigits
      : 2
  const fallbackPrecision =
    typeof options.fallbackPrecision === "number"
      ? options.fallbackPrecision
      : maximumFractionDigits

  try {
    return new Intl.NumberFormat(resolveLocaleFromCurrency(safeCurrencyCode), {
      style: "currency",
      currency: safeCurrencyCode,
      // `symbol` (the Intl default) renders RON as the ISO code "RON" in
      // ro-RO, while Romanian shops render "lei". `narrowSymbol` yields "lei"
      // and leaves €, Kč and Ft unchanged for sk-SK/cs-CZ/hu-HU.
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(safeAmount)
  } catch {
    return `${safeAmount.toFixed(fallbackPrecision)} ${resolveFallbackCurrencySymbol(safeCurrencyCode)}`
  }
}

export const formatWholeCurrencyAmount = (
  amount: number,
  currencyCode?: string | null
): string =>
  formatCurrencyAmount(amount, currencyCode, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    fallbackPrecision: 0,
  })
