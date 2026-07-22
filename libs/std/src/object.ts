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

type OmitUndefined<T extends object> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<
    T[K],
    undefined
  >
}

export const omitUndefined = <T extends object>(value: T): OmitUndefined<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as OmitUndefined<T>

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
