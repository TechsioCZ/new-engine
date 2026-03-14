import { queryOptions } from "@tanstack/react-query"
import type { MedusaCategoryListInput } from "@techsio/storefront-data/categories/medusa-service"
import { storefront } from "@/hooks/storefront-preset"
import { cacheConfig } from "@/lib/cache-config"
import { normalizeCategoryRegistry } from "./normalize-registry"
import type { CategoryRegistry } from "./types"

const CATEGORY_FIELDS = "id,name,handle,description,parent_category_id,metadata"
const CATEGORY_PAGE_SIZE = 100

type RawCategory = {
  id?: string | null
  name?: string | null
  handle?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  parent_category_id?: string | null
}

export const categoryRegistryQueryKey = ["n1", "category-registry"] as const

const fetchAllCategories = async (): Promise<RawCategory[]> => {
  const categories: RawCategory[] = []
  let offset = 0
  let total = 0

  do {
    const response = await storefront.services.categories.getCategories({
      limit: CATEGORY_PAGE_SIZE,
      offset,
      fields: CATEGORY_FIELDS,
    } as MedusaCategoryListInput)

    const page = (response.categories ?? []) as RawCategory[]
    if (!page.length) {
      break
    }

    categories.push(...page)
    total = response.count ?? categories.length
    offset += page.length
  } while (offset < total)

  return categories
}

const fetchCategoryRegistry = async (): Promise<CategoryRegistry> => {
  const categories = await fetchAllCategories()
  return normalizeCategoryRegistry(categories)
}

export const createCategoryRegistryQueryOptions = () =>
  queryOptions({
    queryKey: categoryRegistryQueryKey,
    queryFn: fetchCategoryRegistry,
    ...cacheConfig.semiStatic,
  })
