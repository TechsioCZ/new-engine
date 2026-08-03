export const clamp = (
  value: number,
  minimum: number,
  maximum: number
): number => {
  if (minimum > maximum) {
    throw new RangeError("Minimum cannot exceed maximum")
  }

  return Math.min(Math.max(value, minimum), maximum)
}
