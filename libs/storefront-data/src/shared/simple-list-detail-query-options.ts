import { createCacheConfig } from "./cache-config"
import type { CacheConfig, CacheStrategy } from "./cache-config"
import type { QueryFactoryOptions, ReadQueryOptions } from "./hook-types"
import type { QueryKey } from "./query-keys"

interface EnabledInput {
  enabled?: boolean
}

type DetailInputBase = EnabledInput & {
  id?: string
}

interface SimpleQueryKeys<TListParams, TDetailParams> {
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

interface SimpleReadOptions<TData> {
  queryOptions?: ReadQueryOptions<TData>
  cacheStrategy?: CacheStrategy
}

export interface SimpleListDetailQueryOptionsFactory<
  TListResponse,
  TDetailResult,
  TListInput extends EnabledInput,
  TDetailInput extends DetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: SimpleReadOptions<TListResponse>,
  ) => QueryFactoryOptions<TListResponse>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: SimpleReadOptions<TDetailResult>,
  ) => QueryFactoryOptions<TDetailResult>
}

export interface CreateSimpleListDetailQueryOptionsFactoryConfig<
  TListResponse,
  TDetailResult,
  TListInput extends EnabledInput,
  TListParams,
  TDetailInput extends DetailInputBase,
  TDetailParams,
> {
  getList: (params: TListParams, signal?: AbortSignal) => Promise<TListResponse>
  getDetail: (
    params: TDetailParams,
    signal?: AbortSignal,
  ) => Promise<TDetailResult>
  buildListParams: (input: TListInput) => TListParams
  buildDetailParams: (input: TDetailInput) => TDetailParams
  queryKeys: SimpleQueryKeys<TListParams, TDetailParams>
  cacheConfig?: CacheConfig
  defaultCacheStrategy?: CacheStrategy
  isDetailInputReady?: (input: TDetailInput) => boolean
  missingDetailErrorMessage: string
}

export const createSimpleListDetailQueryOptionsFactory = <
  TListResponse,
  TDetailResult,
  TListInput extends EnabledInput,
  TListParams,
  TDetailInput extends DetailInputBase,
  TDetailParams,
>({
  getList,
  getDetail,
  buildListParams,
  buildDetailParams,
  queryKeys,
  cacheConfig,
  defaultCacheStrategy = "static",
  isDetailInputReady = (input) => Boolean(input.id),
  missingDetailErrorMessage,
}: CreateSimpleListDetailQueryOptionsFactoryConfig<
  TListResponse,
  TDetailResult,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): SimpleListDetailQueryOptionsFactory<
  TListResponse,
  TDetailResult,
  TListInput,
  TDetailInput
> => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()

  return {
    getDetailQueryOptions: (
      input,
      options,
    ): QueryFactoryOptions<TDetailResult> => {
      const detailParams = buildDetailParams(input)
      const cacheStrategy = options?.cacheStrategy ?? defaultCacheStrategy

      return {
        queryFn: async ({ signal }: { signal?: AbortSignal }) => {
          if (!isDetailInputReady(input)) {
            throw new Error(missingDetailErrorMessage)
          }

          return await getDetail(detailParams, signal)
        },
        queryKey: queryKeys.detail(detailParams),
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
    getListQueryOptions: (
      input,
      options,
    ): QueryFactoryOptions<TListResponse> => {
      const listParams = buildListParams(input)
      const cacheStrategy = options?.cacheStrategy ?? defaultCacheStrategy

      return {
        queryFn: async ({ signal }: { signal?: AbortSignal }) =>
          await getList(listParams, signal),
        queryKey: queryKeys.list(listParams),
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
  }
}
