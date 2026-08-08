export const isObjectRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

export const hasArrayData = <T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is {
  data: T[]
} => {
  if (!isObjectRecord(value) || !isUnknownArray(value["data"])) {
    return false
  }

  return value["data"].every(isItem)
}
