import { formatWholeCurrencyAmount } from "@/lib/storefront/price-format";

export type PriceBandDefinition = {
  id: string;
  min: number;
  maxExclusive: number | null;
};

export const buildPriceBandDefinitions = (
  amounts: number[],
): PriceBandDefinition[] => {
  if (amounts.length === 0) {
    return [];
  }

  const minimum = Math.floor(Math.min(...amounts));
  const maximum = Math.ceil(Math.max(...amounts));

  if (minimum >= maximum) {
    return [
      {
        id: `price-${minimum}-plus`,
        min: minimum,
        maxExclusive: null,
      },
    ];
  }

  const bandCount = 4;
  const span = maximum - minimum;
  const step = Math.max(Math.ceil(span / bandCount), 1);
  const definitions: PriceBandDefinition[] = [];

  for (let index = 0; index < bandCount; index += 1) {
    const start = minimum + index * step;
    if (start > maximum) {
      break;
    }

    const nextBoundary = start + step;
    const maxExclusive = nextBoundary > maximum ? null : nextBoundary;

    definitions.push({
      id: `price-${start}-${maxExclusive ?? "plus"}`,
      min: start,
      maxExclusive,
    });

    if (maxExclusive === null) {
      break;
    }
  }

  return definitions;
};

export const matchesPriceBand = (
  amount: number,
  definition: PriceBandDefinition,
) => {
  if (definition.maxExclusive === null) {
    return amount >= definition.min;
  }

  return amount >= definition.min && amount < definition.maxExclusive;
};

export const formatAmount = formatWholeCurrencyAmount;

export const formatPriceBandLabel = (
  definition: PriceBandDefinition,
  currencyCode: string,
): string => {
  if (definition.maxExclusive === null) {
    return `${formatAmount(definition.min, currencyCode)}+`;
  }

  return `${formatAmount(definition.min, currencyCode)} - ${formatAmount(
    definition.maxExclusive,
    currencyCode,
  )}`;
};
