export const resolvePositiveInteger = (
  value: number | undefined,
  fallbackValue: number
): number => {
  const normalizedFallback =
    typeof fallbackValue === "number" &&
    Number.isFinite(fallbackValue) &&
    !Number.isNaN(fallbackValue) &&
    Math.trunc(fallbackValue) > 0
      ? Math.trunc(fallbackValue)
      : 1

  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return normalizedFallback
  }

  const normalizedValue = Math.trunc(value)
  if (normalizedValue < 1) {
    return normalizedFallback
  }

  return normalizedValue
}
