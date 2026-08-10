export const isRecord = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const toPlainRecord = (value: unknown): object | undefined =>
  isRecord(value) ? value : undefined

export const getRecordValue = (record: object, key: string): unknown =>
  Reflect.get(record, key)

type OmitUndefined<T extends object> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<
    T[K],
    undefined
  >
}

export const omitUndefined = <T extends object>(value: T): OmitUndefined<T> => {
  const result = { ...value }
  for (const [key, entry] of Object.entries(result)) {
    if (entry === undefined) {
      Reflect.deleteProperty(result, key)
    }
  }
  return result
}

export const omitKeys = <
  TObject extends object,
  const TKeys extends readonly (keyof TObject)[],
>(
  object: TObject,
  keys: TKeys,
): Omit<TObject, TKeys[number]> => {
  const result = { ...object }
  for (const key of keys) {
    Reflect.deleteProperty(result, key)
  }
  return result
}

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
