import { queryOptions } from "@tanstack/react-query"
import type { MedusaCategoryListInput } from "@techsio/storefront-data/categories/medusa-service"
import { cacheConfig } from "@/lib/cache-config"
import { storefront } from "@/lib/storefront"
import { normalizeCategoryRegistry } from "./normalize-registry"
import type { CategoryRegistry } from "./types"

const CATEGORY_FIELDS = "id,name,handle,description,parent_category_id"
const CATEGORY_PAGE_SIZE = 100

type RawCategory = {
  id?: string | null
  name?: string | null
  handle?: string | null
  description?: string | null
  parent_category_id?: string | null
}

const categoryRegistryQueryKey = ["frontend-demo", "category-registry"] as const

const fetchAllCategories = async (
  signal?: AbortSignal
): Promise<RawCategory[]> => {
  const categories: RawCategory[] = []
  let offset = 0
  let total = 0

  do {
    const response = await storefront.services.categories.getCategories(
      {
        limit: CATEGORY_PAGE_SIZE,
        offset,
        fields: CATEGORY_FIELDS,
      } as MedusaCategoryListInput,
      signal
    )

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

const fetchCategoryRegistry = async (
  signal?: AbortSignal
): Promise<CategoryRegistry> => {
  const categories = await fetchAllCategories(signal)
  return normalizeCategoryRegistry(categories)
}

export const createCategoryRegistryQueryOptions = () =>
  queryOptions({
    queryKey: categoryRegistryQueryKey,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchCategoryRegistry(signal),
    ...cacheConfig.categories,
  })
