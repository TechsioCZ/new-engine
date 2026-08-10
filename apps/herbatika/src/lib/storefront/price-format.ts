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

interface FormatCurrencyAmountOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  fallbackPrecision?: number
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>()

const getCurrencyFormatter = (
  currencyCode: string,
  maximumFractionDigits: number,
  minimumFractionDigits: number,
) => {
  const locale = resolveLocaleFromCurrency(currencyCode)
  const cacheKey = `${locale}:${currencyCode}:${minimumFractionDigits}:${maximumFractionDigits}`
  const cachedFormatter = currencyFormatterCache.get(cacheKey)
  if (cachedFormatter) {
    return cachedFormatter
  }

  const formatter = Intl.NumberFormat(locale, {
    currency: currencyCode,
    maximumFractionDigits,
    minimumFractionDigits,
    style: "currency",
  })
  currencyFormatterCache.set(cacheKey, formatter)
  return formatter
}

export const formatCurrencyAmount = (
  amount: number,
  currencyCode?: string | null,
  options: FormatCurrencyAmountOptions = {},
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
    return getCurrencyFormatter(
      safeCurrencyCode,
      maximumFractionDigits,
      minimumFractionDigits,
    ).format(safeAmount)
  } catch {
    return `${safeAmount.toFixed(fallbackPrecision)} ${safeCurrencyCode}`
  }
}

export const formatWholeCurrencyAmount = (
  amount: number,
  currencyCode?: string | null,
): string =>
  formatCurrencyAmount(amount, currencyCode, {
    fallbackPrecision: 0,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
