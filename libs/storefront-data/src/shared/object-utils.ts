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
