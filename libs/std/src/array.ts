export const unique = <T>(values: readonly T[]): T[] => [...new Set(values)]

export const chunk = <T>(values: readonly T[], size: number): T[][] => {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError("Chunk size must be a positive integer")
  }

  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size)
  )
}
