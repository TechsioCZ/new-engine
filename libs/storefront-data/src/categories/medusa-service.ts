import type Medusa from "@medusajs/js-sdk"
import type { FindParams, HttpTypes, SelectParams } from "@medusajs/types"
import type { CategoryListResponse, CategoryService } from "./types"

type MedusaCategoryListQuery = FindParams &
  HttpTypes.StoreProductCategoryListParams &
  Record<string, unknown>

type MedusaCategoryDetailQuery = SelectParams & Record<string, unknown>

export type MedusaCategoryListInput = FindParams &
  HttpTypes.StoreProductCategoryListParams & {
    enabled?: boolean
  }

export type MedusaCategoryDetailInput = SelectParams & {
  id?: string
  enabled?: boolean
}

export type MedusaCategoryTransformListContext<
  TListParams extends MedusaCategoryListInput,
> = {
  params: TListParams
  query: MedusaCategoryListQuery
  response: HttpTypes.StoreProductCategoryListResponse
}

export type MedusaCategoryTransformDetailContext<
  TDetailParams extends MedusaCategoryDetailInput,
> = {
  params: TDetailParams
  query: MedusaCategoryDetailQuery
  response: HttpTypes.StoreProductCategoryResponse
}

export type MedusaCategoryServiceConfig<
  TCategory,
  TListParams extends MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput,
> = {
  listPath?: string
  defaultListFields?: string
  defaultDetailFields?: string
  normalizeListQuery?: (params: TListParams) => MedusaCategoryListQuery
  normalizeDetailQuery?: (params: TDetailParams) => MedusaCategoryDetailQuery
  transformCategory?: (category: HttpTypes.StoreProductCategory) => TCategory
  transformListCategory?: (
    category: HttpTypes.StoreProductCategory,
    context: MedusaCategoryTransformListContext<TListParams>
  ) => TCategory
  transformDetailCategory?: (
    category: HttpTypes.StoreProductCategory,
    context: MedusaCategoryTransformDetailContext<TDetailParams>
  ) => TCategory
}

const stripEnabled = <TQuery extends Record<string, unknown>>(
  query: TQuery
): TQuery => {
  const { enabled: _enabled, ...rest } = query as TQuery & {
    enabled?: boolean
  }
  return rest as TQuery
}

/**
 * Creates a CategoryService for Medusa Store API.
 *
 * Uses `/store/product-categories` through `sdk.client.fetch` so query cancellation
 * works with `AbortSignal` passed by TanStack Query.
 */
export function createMedusaCategoryService<
  TCategory = HttpTypes.StoreProductCategory,
  TListParams extends MedusaCategoryListInput = MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput = MedusaCategoryDetailInput,
>(
  sdk: Medusa,
  config?: MedusaCategoryServiceConfig<TCategory, TListParams, TDetailParams>
): CategoryService<TCategory, TListParams, TDetailParams> {
  const {
    listPath = "/store/product-categories",
    defaultListFields,
    defaultDetailFields,
    normalizeListQuery,
    normalizeDetailQuery,
    transformCategory,
    transformListCategory,
    transformDetailCategory,
  } = config ?? {}

  const baseTransform =
    transformCategory ?? ((category) => category as unknown as TCategory)

  const mapListCategory: (
    category: HttpTypes.StoreProductCategory,
    context: MedusaCategoryTransformListContext<TListParams>
  ) => TCategory =
    transformListCategory ??
    ((category: HttpTypes.StoreProductCategory) => baseTransform(category))

  const mapDetailCategory: (
    category: HttpTypes.StoreProductCategory,
    context: MedusaCategoryTransformDetailContext<TDetailParams>
  ) => TCategory =
    transformDetailCategory ??
    ((category: HttpTypes.StoreProductCategory) => baseTransform(category))

  const buildListQuery = (params: TListParams): MedusaCategoryListQuery => {
    const query = normalizeListQuery
      ? normalizeListQuery(params)
      : ({
          ...params,
          ...(defaultListFields && !params.fields
            ? { fields: defaultListFields }
            : {}),
        } as MedusaCategoryListQuery)

    return stripEnabled(query)
  }

  const buildDetailQuery = (
    params: TDetailParams
  ): MedusaCategoryDetailQuery => {
    const query = normalizeDetailQuery
      ? normalizeDetailQuery(params)
      : ({
          ...params,
          ...(defaultDetailFields && !params.fields
            ? { fields: defaultDetailFields }
            : {}),
        } as MedusaCategoryDetailQuery)

    const { id: _id, ...withoutId } = query as MedusaCategoryDetailQuery & {
      id?: string
    }
    return stripEnabled(withoutId)
  }

  return {
    async getCategories(
      params: TListParams,
      signal?: AbortSignal
    ): Promise<CategoryListResponse<TCategory>> {
      const query = buildListQuery(params)
      const response =
        await sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
          listPath,
          {
            query,
            signal,
          }
        )

      const categories = (response.product_categories ?? []).map((category) =>
        mapListCategory(category, { params, query, response })
      )

      return {
        categories,
        count: response.count ?? categories.length,
      }
    },

    async getCategory(
      params: TDetailParams,
      signal?: AbortSignal
    ): Promise<TCategory | null> {
      if (!params.id) {
        return null
      }

      const query = buildDetailQuery(params)
      const response = await sdk.client.fetch<HttpTypes.StoreProductCategoryResponse>(
        `${listPath}/${params.id}`,
        {
          query,
          signal,
        }
      )

      const category = response.product_category
      if (!category) {
        return null
      }

      return mapDetailCategory(category, { params, query, response })
    },
  }
}
