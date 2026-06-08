export const isObjectRecord = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isPlainRecord = (
  value: unknown
): value is Record<string, unknown> =>
  isObjectRecord(value) && !Array.isArray(value)
