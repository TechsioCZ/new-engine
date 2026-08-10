import { useSearchParams } from "react-router-dom"

type QueryParams<T extends string> = Partial<Record<T, string>>

export const useQueryParams = <T extends string>(
  keys: T[],
  prefix?: string,
): QueryParams<T> => {
  const [params] = useSearchParams()

  const result: QueryParams<T> = {}

  for (const key of keys) {
    const prefixedKey =
      prefix !== undefined && prefix.length > 0 ? `${prefix}_${key}` : key
    const value = params.get(prefixedKey) ?? undefined

    result[key] = value
  }

  return result
}
