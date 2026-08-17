export const normalizeFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") {
    return
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
