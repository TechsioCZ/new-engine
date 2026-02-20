import type { CatalogQueryState } from "./parsers";

const MAX_MULTI_VALUE_ITEMS = 40;

export const normalizeMultiValueInput = (values: string[]): string[] => {
  const normalizedValues: string[] = [];
  const seenValues = new Set<string>();

  for (const value of values) {
    const normalizedValue = value.trim();
    if (!normalizedValue || seenValues.has(normalizedValue)) {
      continue;
    }

    seenValues.add(normalizedValue);
    normalizedValues.push(normalizedValue);

    if (normalizedValues.length >= MAX_MULTI_VALUE_ITEMS) {
      break;
    }
  }

  return normalizedValues;
};

export const areStringArraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
};

const normalizeNonNegativeNumber = (
  value: number | null,
): number | undefined => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return undefined;
  }

  return value;
};

export const normalizePriceRange = (
  minValue: number | null,
  maxValue: number | null,
): { min?: number; max?: number } => {
  let normalizedMin = normalizeNonNegativeNumber(minValue);
  let normalizedMax = normalizeNonNegativeNumber(maxValue);

  if (
    normalizedMin !== undefined &&
    normalizedMax !== undefined &&
    normalizedMin > normalizedMax
  ) {
    const originalMin = normalizedMin;
    normalizedMin = normalizedMax;
    normalizedMax = originalMin;
  }

  return {
    min: normalizedMin,
    max: normalizedMax,
  };
};

export const toNonEmptyArray = (values: string[]): string[] | undefined => {
  const normalizedValues = normalizeMultiValueInput(values);
  if (normalizedValues.length === 0) {
    return undefined;
  }

  return normalizedValues;
};

export const hasOwnKey = <T extends object>(
  value: T,
  key: PropertyKey,
): key is keyof T => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

export const areCatalogQueryValuesEqual = (
  left: CatalogQueryState[keyof CatalogQueryState],
  right: CatalogQueryState[keyof CatalogQueryState],
) => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return areStringArraysEqual(left, right);
  }

  if (typeof left === "number" && typeof right === "number") {
    return Number.isNaN(left) ? Number.isNaN(right) : left === right;
  }

  return left === right;
};
