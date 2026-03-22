"use client"

import { useQuery } from "@tanstack/react-query"
import { createCategoryRegistryQueryOptions } from "@/lib/categories/query-options"
import { emptyCategoryRegistry } from "@/lib/categories/types"

export function useCategoryRegistry() {
  const query = useQuery(createCategoryRegistryQueryOptions())

  return {
    ...query,
    categoryRegistry: query.data ?? emptyCategoryRegistry,
  }
}
