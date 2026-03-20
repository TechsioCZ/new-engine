import { queryOptions } from "@tanstack/react-query"
import type { MedusaCategoryListInput } from "@techsio/storefront-data/categories/medusa-service"
import { storefront } from "@/hooks/storefront-preset"
import { cacheConfig } from "@/lib/cache-config"
import { normalizeCategoryRegistry } from "./normalize-registry"
import type { CategoryRegistry, RawCategory } from "./types"

const CATEGORY_FIELDS = "id,name,handle,description,parent_category_id,metadata"
const CATEGORY_PAGE_SIZE = 100

export const categoryRegistryQueryKey = ["n1", "category-registry"] as const

const fetchAllCategories = async (
  signal?: AbortSignal
): Promise<RawCategory[]> => {
  const categories: RawCategory[] = []
  let offset = 0

  while (true) {
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
    offset += page.length

    // Continue paging based on page size because the category service falls back
    // count to the current page length when the backend omits a total count.
    if (page.length < CATEGORY_PAGE_SIZE) {
      break
    }
  }

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
    ...cacheConfig.semiStatic,
  })
