import { useMemo } from "react"
import { buildHeaderNavigation } from "@/data/header"
import { emptyCategoryRegistry } from "@/lib/categories/types"
import { useCategoryRegistry } from "./use-category-registry"

export function useHeaderNavigation() {
  const { categoryRegistry: rawCategoryRegistry, ...query } =
    useCategoryRegistry()
  const categoryRegistry = rawCategoryRegistry ?? emptyCategoryRegistry
  const navigation = useMemo(
    () => buildHeaderNavigation(rawCategoryRegistry),
    [rawCategoryRegistry]
  )

  return {
    ...query,
    categoryRegistry,
    ...navigation,
  }
}
