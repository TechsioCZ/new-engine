import type Medusa from "@medusajs/js-sdk"
import type { FindParams, HttpTypes, SelectParams } from "@medusajs/types"
import { omitKeys, toPlainRecord } from "@techsio/std/object"

import type { IsExactly } from "../shared/type-utils"
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

export interface MedusaCategoryTransformListContext<
  TListParams extends MedusaCategoryListInput,
> {
  params: TListParams
  query: MedusaCategoryListQuery
  response: HttpTypes.StoreProductCategoryListResponse
}

export interface MedusaCategoryTransformDetailContext<
  TDetailParams extends MedusaCategoryDetailInput,
> {
  params: TDetailParams
  query: MedusaCategoryDetailQuery
  response: HttpTypes.StoreProductCategoryResponse
}

interface MedusaCategoryServiceConfigBase<
  TListParams extends MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput,
> {
  listPath?: string
  defaultListFields?: string
  defaultDetailFields?: string
  normalizeListQuery?: (params: TListParams) => MedusaCategoryListQuery
  normalizeDetailQuery?: (params: TDetailParams) => MedusaCategoryDetailQuery
}

type MedusaCategoryTransforms<
  TCategory,
  TListParams extends MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput,
> =
  | {
      transformCategory: (category: HttpTypes.StoreProductCategory) => TCategory
      transformListCategory?: (
        category: HttpTypes.StoreProductCategory,
        context: MedusaCategoryTransformListContext<TListParams>,
      ) => TCategory
      transformDetailCategory?: (
        category: HttpTypes.StoreProductCategory,
        context: MedusaCategoryTransformDetailContext<TDetailParams>,
      ) => TCategory
    }
  | {
      transformCategory?: never
      transformListCategory: (
        category: HttpTypes.StoreProductCategory,
        context: MedusaCategoryTransformListContext<TListParams>,
      ) => TCategory
      transformDetailCategory: (
        category: HttpTypes.StoreProductCategory,
        context: MedusaCategoryTransformDetailContext<TDetailParams>,
      ) => TCategory
    }

export type MedusaCategoryServiceConfig<
  TCategory,
  TListParams extends MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput,
> = MedusaCategoryServiceConfigBase<TListParams, TDetailParams> &
  (IsExactly<TCategory, HttpTypes.StoreProductCategory> extends true
    ? Partial<MedusaCategoryTransforms<TCategory, TListParams, TDetailParams>>
    : MedusaCategoryTransforms<TCategory, TListParams, TDetailParams>)

/**
 * Creates a CategoryService for Medusa Store API.
 *
 * Uses `/store/product-categories` through `sdk.client.fetch` so query cancellation
 * works with `AbortSignal` passed by TanStack Query.
 */
type MedusaCategoryServiceArgs<
  TCategory,
  TListParams extends MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput,
> =
  IsExactly<TCategory, HttpTypes.StoreProductCategory> extends true
    ? [
        config?:
          | MedusaCategoryServiceConfig<TCategory, TListParams, TDetailParams>
          | undefined,
      ]
    : [
        config:
          | MedusaCategoryServiceConfig<TCategory, TListParams, TDetailParams>
          | undefined,
      ]

export function createMedusaCategoryService<
  TCategory = HttpTypes.StoreProductCategory,
  TListParams extends MedusaCategoryListInput = MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput = MedusaCategoryDetailInput,
>(
  sdk: Medusa,
  ...[config]: MedusaCategoryServiceArgs<TCategory, TListParams, TDetailParams>
): CategoryService<TCategory, TListParams, TDetailParams>
export function createMedusaCategoryService<
  TListParams extends MedusaCategoryListInput,
  TDetailParams extends MedusaCategoryDetailInput,
>(
  sdk: Medusa,
  config?: MedusaCategoryServiceConfigBase<TListParams, TDetailParams> &
    Partial<MedusaCategoryTransforms<unknown, TListParams, TDetailParams>>,
): CategoryService<unknown, TListParams, TDetailParams> {
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
    transformCategory ??
    ((category: HttpTypes.StoreProductCategory) => category)

  const mapListCategory =
    transformListCategory ??
    ((category: HttpTypes.StoreProductCategory) => baseTransform(category))

  const mapDetailCategory =
    transformDetailCategory ??
    ((category: HttpTypes.StoreProductCategory) => baseTransform(category))

  const buildListQuery = (params: TListParams): MedusaCategoryListQuery => {
    const hasDefaultFields =
      defaultListFields !== undefined && defaultListFields.length > 0
    const hasParamFields =
      params.fields !== undefined && params.fields.length > 0
    const query: MedusaCategoryListQuery = normalizeListQuery
      ? normalizeListQuery(params)
      : {
          ...toPlainRecord(params),
          ...(hasDefaultFields && !hasParamFields
            ? { fields: defaultListFields }
            : {}),
        }

    return omitKeys(query, ["enabled"])
  }

  const buildDetailQuery = (
    params: TDetailParams,
  ): MedusaCategoryDetailQuery => {
    const hasDefaultFields =
      defaultDetailFields !== undefined && defaultDetailFields.length > 0
    const hasParamFields =
      params.fields !== undefined && params.fields.length > 0
    const query: MedusaCategoryDetailQuery = normalizeDetailQuery
      ? normalizeDetailQuery(params)
      : {
          ...toPlainRecord(params),
          ...(hasDefaultFields && !hasParamFields
            ? { fields: defaultDetailFields }
            : {}),
        }

    return omitKeys(query, ["enabled", "id"])
  }

  return {
    async getCategories(
      params: TListParams,
      signal?: AbortSignal,
    ): Promise<CategoryListResponse<unknown>> {
      const query = buildListQuery(params)
      const response =
        await sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
          listPath,
          {
            query,
            signal: signal ?? null,
          },
        )

      const categories = (response.product_categories ?? []).map((category) =>
        mapListCategory(category, { params, query, response }),
      )

      return {
        categories,
        count: response.count ?? categories.length,
      }
    },

    async getCategory(
      params: TDetailParams,
      signal?: AbortSignal,
    ): Promise<unknown> {
      if (params.id === undefined || params.id.length === 0) {
        return null
      }

      const query = buildDetailQuery(params)
      const response =
        await sdk.client.fetch<HttpTypes.StoreProductCategoryResponse>(
          `${listPath}/${params.id}`,
          {
            query,
            signal: signal ?? null,
          },
        )

      const responseRecord = toPlainRecord(response)
      const { product_category: rawCategory } = responseRecord ?? {}
      if (toPlainRecord(rawCategory) === undefined) {
        return null
      }

      const category = response.product_category
      return mapDetailCategory(category, { params, query, response })
    },
  }
}
