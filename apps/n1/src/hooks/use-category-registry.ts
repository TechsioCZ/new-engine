import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createCategoryRegistryQueryOptions } from "@/lib/categories/query-options"

export function useCategoryRegistry() {
  const query = useQuery(createCategoryRegistryQueryOptions())

  return {
    ...query,
    categoryRegistry: query.data,
  }
}

export function useSuspenseCategoryRegistry() {
  const query = useSuspenseQuery(createCategoryRegistryQueryOptions())
  return query.data
}
