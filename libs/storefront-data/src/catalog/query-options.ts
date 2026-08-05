import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
import { createCatalogQueryKeys } from "./query-keys"
import type {
  CatalogFacets,
  CatalogListInputBase,
  CatalogListResponse,
  CatalogQueryKeys,
  CatalogService,
  RegionInfo,
} from "./types"

export interface CreateCatalogQueryOptionsFactoryConfig<
  TProduct,
  TListInput extends CatalogListInputBase,
  TListParams,
  TFacets,
> {
  service: CatalogService<TProduct, TListParams, TFacets>
  buildListParams?: (input: TListInput) => TListParams
  queryKeys?: CatalogQueryKeys<TListParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export interface CatalogQueryOptionsFactory<
  TProduct,
  TListInput extends CatalogListInputBase,
  TFacets,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CatalogListResponse<TProduct, TFacets>>
      region?: RegionInfo | null
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<CatalogListResponse<TProduct, TFacets>>
}

export function createCatalogQueryOptionsFactory<
  TProduct,
  TListInput extends CatalogListInputBase,
  TListParams,
  TFacets = CatalogFacets,
>({
  service,
  buildListParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateCatalogQueryOptionsFactoryConfig<
  TProduct,
  TListInput,
  TListParams,
  TFacets
>): CatalogQueryOptionsFactory<TProduct, TListInput, TFacets> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createCatalogQueryKeys<TListParams>(queryKeyNamespace)
  const buildList =
    buildListParams ??
    ((input: TListInput) => ({ ...input }) as TListInput & TListParams)

  return {
    getListQueryOptions: (
      input,
      options,
    ): QueryFactoryOptions<CatalogListResponse<TProduct, TFacets>> => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(
        listInput as TListInput,
        options?.region ?? undefined,
      )
      const listParams = buildList(resolvedInput)
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryFn: async ({ signal }) =>
          await service.getCatalogProducts(listParams, signal),
        queryKey: resolvedQueryKeys.list(listParams),
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
  }
}
