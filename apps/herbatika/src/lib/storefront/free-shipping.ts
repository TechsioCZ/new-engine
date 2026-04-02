const FREE_SHIPPING_THRESHOLDS = {
  EUR: 49,
} as const;

export const resolveFreeShippingThresholdAmount = (
  currencyCode: string,
): number | null => {
  const normalizedCurrencyCode = currencyCode.toUpperCase();

  return FREE_SHIPPING_THRESHOLDS[
    normalizedCurrencyCode as keyof typeof FREE_SHIPPING_THRESHOLDS
  ] ?? null;
};
