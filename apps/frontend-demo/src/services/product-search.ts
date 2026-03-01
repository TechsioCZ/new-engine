import {
  fetchProductsViaMeiliAndCategorySearch,
  fetchProductsViaMeili,
  fetchProductsViaMeiliAndVariantSearch,
  fetchProductsViaVariantSearch,
} from "./product-search/product-fetchers"
import {
  normalizeCategoriesInput,
  normalizeSizes,
  selectProductFetchStrategy,
} from "./product-search/strategy"
import type {
  RawProductListResponse,
  SearchStrategyInput,
} from "./product-search/types"

export async function tryGetProductsFromSearchStrategies(
  input: SearchStrategyInput
): Promise<RawProductListResponse | null> {
  if (input.signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError")
  }

  const {
    limit,
    offset,
    fields,
    filters,
    category,
    sort,
    q,
    region_id,
    country_code,
    signal,
  } = input

  const normalizedQuery = q?.trim()
  const normalizedSizes = normalizeSizes(filters?.sizes)
  const normalizedCategories = normalizeCategoriesInput(category, filters)
  const strategy = selectProductFetchStrategy({ q, sort, category, filters })

  switch (strategy) {
    case "MEILI_CATEGORY_INTERSECTION":
      try {
        return await fetchProductsViaMeiliAndCategorySearch({
          query: normalizedQuery || "",
          categories: normalizedCategories,
          limit,
          offset,
          fields,
          region_id,
          country_code,
          signal,
        })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error
        }

        console.warn(
          "[ProductService] Meili + category intersection failed, falling back to default listing:",
          error
        )
        return null
      }
    case "MEILI_SIZE_INTERSECTION":
      try {
        return await fetchProductsViaMeiliAndVariantSearch({
          query: normalizedQuery || "",
          sizes: normalizedSizes,
          limit,
          offset,
          fields,
          region_id,
          country_code,
          signal,
        })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error
        }

        console.warn(
          "[ProductService] Meili + variant intersection failed, falling back to variant-only search:",
          error
        )

        try {
          return await fetchProductsViaVariantSearch({
            sizes: normalizedSizes,
            q: normalizedQuery,
            limit,
            offset,
            fields,
            region_id,
            country_code,
            signal,
          })
        } catch (secondaryError) {
          if (secondaryError instanceof Error && secondaryError.name === "AbortError") {
            throw secondaryError
          }

          console.warn(
            "[ProductService] Exact variant fallback also failed, using default listing:",
            secondaryError
          )
          return null
        }
      }
    case "SIZE_ONLY_FALLBACK":
      try {
        return await fetchProductsViaVariantSearch({
          sizes: normalizedSizes,
          q: undefined,
          limit,
          offset,
          fields,
          region_id,
          country_code,
          signal,
        })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error
        }

        console.warn(
          "[ProductService] Variant-size fallback failed, falling back to default listing:",
          error
        )
        return null
      }
    case "MEILI_ONLY":
      try {
        return await fetchProductsViaMeili({
          query: normalizedQuery || "",
          limit,
          offset,
          fields,
          region_id,
          country_code,
          signal,
        })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error
        }

        console.warn(
          "[ProductService] Meili search failed, falling back to default listing:",
          error
        )
        return null
      }
    case "DEFAULT_MEDUSA":
    default:
      return null
  }
}
