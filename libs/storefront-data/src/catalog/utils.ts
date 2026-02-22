export const resolvePositiveInteger = (
  value: number | undefined,
  fallbackValue: number
): number => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallbackValue
  }

  const normalizedValue = Math.trunc(value)
  if (normalizedValue < 1) {
    return fallbackValue
  }

  return normalizedValue
}
