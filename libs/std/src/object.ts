export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const toPlainRecord = (
  value: unknown
): Record<string, unknown> | undefined => (isRecord(value) ? value : undefined)

export const compactRecord = (
  record: Readonly<Record<string, unknown>>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  )

export const omitKeys = <
  TObject extends object,
  const TKeys extends readonly (keyof TObject)[],
>(
  object: TObject,
  keys: TKeys
): Omit<TObject, TKeys[number]> => {
  const keysToOmit = new Set<keyof TObject>(keys)
  const entries = Object.entries(object).filter(
    ([key]) => !keysToOmit.has(key as keyof TObject)
  )

  return Object.fromEntries(entries) as Omit<TObject, TKeys[number]>
}

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
