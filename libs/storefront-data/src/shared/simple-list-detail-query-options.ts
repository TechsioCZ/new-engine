import {
  type CacheConfig,
  type CacheStrategy,
  createCacheConfig,
} from "./cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "./hook-types"
import type { QueryKey } from "./query-keys"

type EnabledInput = {
  enabled?: boolean
}

type DetailInputBase = EnabledInput & {
  id?: string
}

type SimpleQueryKeys<TListParams, TDetailParams> = {
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

type SimpleReadOptions<TData> = {
  queryOptions?: ReadQueryOptions<TData>
  cacheStrategy?: CacheStrategy
}

export type SimpleListDetailQueryOptionsFactory<
  TListResponse,
  TDetailResult,
  TListInput extends EnabledInput,
  TDetailInput extends DetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: SimpleReadOptions<TListResponse>
  ) => QueryFactoryOptions<TListResponse>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: SimpleReadOptions<TDetailResult>
  ) => QueryFactoryOptions<TDetailResult>
}

export type CreateSimpleListDetailQueryOptionsFactoryConfig<
  TListResponse,
  TDetailResult,
  TListInput extends EnabledInput,
  TListParams,
  TDetailInput extends DetailInputBase,
  TDetailParams,
> = {
  getList: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<TListResponse>
  getDetail: (
    params: TDetailParams,
    signal?: AbortSignal
  ) => Promise<TDetailResult>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys: SimpleQueryKeys<TListParams, TDetailParams>
  cacheConfig?: CacheConfig
  defaultCacheStrategy?: CacheStrategy
  isDetailInputReady?: (input: TDetailInput) => boolean
  missingDetailErrorMessage: string
}

const stripEnabled = <TInput extends EnabledInput>(input: TInput): TInput => {
  const { enabled: _inputEnabled, ...rest } = input
  return rest as TInput
}

export function createSimpleListDetailQueryOptionsFactory<
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
> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  return {
    getListQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TListResponse> => {
      const listParams = buildList(stripEnabled(input))
      const cacheStrategy = options?.cacheStrategy ?? defaultCacheStrategy

      return {
        queryKey: queryKeys.list(listParams),
        queryFn: ({ signal }: { signal?: AbortSignal }) =>
          getList(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TDetailResult> => {
      const detailParams = buildDetail(stripEnabled(input))
      const cacheStrategy = options?.cacheStrategy ?? defaultCacheStrategy

      return {
        queryKey: queryKeys.detail(detailParams),
        queryFn: ({ signal }: { signal?: AbortSignal }) => {
          if (!isDetailInputReady(input)) {
            throw new Error(missingDetailErrorMessage)
          }

          return getDetail(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
