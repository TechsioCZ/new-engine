import { useMemo } from "react"
import { buildHeaderNavigation } from "@/data/header"
import { useSuspenseCategoryRegistry } from "./use-category-registry"

export function useHeaderNavigation() {
  const categoryRegistry = useSuspenseCategoryRegistry()

  return useMemo(
    () => ({
      categoryRegistry,
      ...buildHeaderNavigation(categoryRegistry),
    }),
    [categoryRegistry]
  )
}
