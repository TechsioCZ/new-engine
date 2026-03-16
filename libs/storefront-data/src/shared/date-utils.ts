export const toComparableTimestamp = (value: unknown): number => {
  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
  }

  return Number.NEGATIVE_INFINITY
}
