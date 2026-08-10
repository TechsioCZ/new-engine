export const resolvePositiveInteger = (
  value: number | undefined,
  fallbackValue: number,
): number => {
  const truncatedFallback = Math.trunc(fallbackValue)
  const isValidFallback =
    Number.isFinite(fallbackValue) &&
    !Number.isNaN(fallbackValue) &&
    truncatedFallback > 0
  const normalizedFallback = isValidFallback ? truncatedFallback : 1

  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return normalizedFallback
  }

  const normalizedValue = Math.trunc(value)
  if (normalizedValue < 1) {
    return normalizedFallback
  }

  return normalizedValue
}
