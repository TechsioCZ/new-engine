const DEFAULT_CURRENCY_CODE = "EUR";

const normalizeCurrencyCode = (currencyCode?: string | null): string => {
  if (typeof currencyCode !== "string") {
    return DEFAULT_CURRENCY_CODE;
  }

  const normalizedCode = currencyCode.trim().toUpperCase();
  if (normalizedCode.length !== 3) {
    return DEFAULT_CURRENCY_CODE;
  }

  return normalizedCode;
};

const resolveLocaleFromCurrency = (currencyCode: string) => {
  if (currencyCode === "CZK") {
    return "cs-CZ";
  }

  return "sk-SK";
};

type FormatCurrencyAmountOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallbackPrecision?: number;
};

export const formatCurrencyAmount = (
  amount: number,
  currencyCode?: string | null,
  options: FormatCurrencyAmountOptions = {},
): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeCurrencyCode = normalizeCurrencyCode(currencyCode);
  const minimumFractionDigits =
    typeof options.minimumFractionDigits === "number"
      ? options.minimumFractionDigits
      : 2;
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === "number"
      ? options.maximumFractionDigits
      : 2;
  const fallbackPrecision =
    typeof options.fallbackPrecision === "number"
      ? options.fallbackPrecision
      : maximumFractionDigits;

  try {
    return new Intl.NumberFormat(resolveLocaleFromCurrency(safeCurrencyCode), {
      style: "currency",
      currency: safeCurrencyCode,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toFixed(fallbackPrecision)} ${safeCurrencyCode}`;
  }
};

export const formatWholeCurrencyAmount = (
  amount: number,
  currencyCode?: string | null,
): string => {
  return formatCurrencyAmount(amount, currencyCode, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    fallbackPrecision: 0,
  });
};
