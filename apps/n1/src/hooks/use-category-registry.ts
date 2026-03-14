import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createCategoryRegistryQueryOptions } from "@/lib/categories/query-options"
import { emptyCategoryRegistry } from "@/lib/categories/types"

export function useCategoryRegistry() {
  const query = useQuery(createCategoryRegistryQueryOptions())

  return {
    ...query,
    categoryRegistry: query.data ?? emptyCategoryRegistry,
  }
}

export function useSuspenseCategoryRegistry() {
  const query = useSuspenseQuery(createCategoryRegistryQueryOptions())
  return query.data
}
