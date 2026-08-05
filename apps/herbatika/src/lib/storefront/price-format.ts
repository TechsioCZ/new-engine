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
    return new Intl.NumberFormat(resolveLocaleFromCurrency(safeCurrencyCode), {
      currency: safeCurrencyCode,
      maximumFractionDigits,
      minimumFractionDigits,
      style: "currency",
    }).format(safeAmount)
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
