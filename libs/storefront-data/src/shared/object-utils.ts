export const isPlainRecord = (
  value: unknown
): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

export const toPlainRecord = (
  value: unknown
): Record<string, unknown> | undefined => {
  if (!isPlainRecord(value)) {
    return
  }

  return value
}

export function omitKeys<
  TObject extends object,
  const TKeys extends readonly (keyof TObject)[],
>(
  object: TObject,
  keys: TKeys
): Omit<TObject, TKeys[number]> {
  const keysToOmit = new Set<keyof TObject>(keys)
  const entries = Object.entries(object).filter(
    ([key]) => !keysToOmit.has(key as keyof TObject)
  )

  return Object.fromEntries(entries) as Omit<TObject, TKeys[number]>
}
