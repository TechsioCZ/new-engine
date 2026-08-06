export const isObjectRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)
