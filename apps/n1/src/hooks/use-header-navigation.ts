import { useMemo } from "react"
import { buildHeaderNavigation } from "@/data/header"
import { useCategoryRegistry } from "./use-category-registry"

export function useHeaderNavigation() {
  const { categoryRegistry } = useCategoryRegistry()

  return useMemo(
    () => ({
      categoryRegistry,
      ...buildHeaderNavigation(categoryRegistry),
    }),
    [categoryRegistry]
  )
}
