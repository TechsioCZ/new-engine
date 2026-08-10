import { appendQueryKey } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
import type {
  ProductDetailInputBase,
  ProductListInputBase,
  ProductQueryKeys,
  ProductService,
  RegionInfo,
} from "./types"

type ProductQueryInput = RegionInfo & {
  enabled?: boolean
}

export const resolveProductQueryInput = <TInput extends ProductQueryInput>(
  input: TInput,
  region?: RegionInfo | null,
): TInput => {
  const queryInput = { ...input }
  delete queryInput.enabled
  return applyRegion(queryInput, region)
}

interface ProductListQueryDefinitionConfig<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailParams,
> {
  input: TListInput
  region?: RegionInfo | null
  service: ProductService<TProduct, TListParams, TDetailParams>
  buildListParams: (input: TListInput) => TListParams
  queryKeys: ProductQueryKeys<TListParams, TDetailParams>
  useGlobalFetcher?: boolean
  transformInput?: (input: TListInput) => TListInput
}

export const createProductListQueryDefinition = <
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailParams,
>({
  input,
  region,
  service,
  buildListParams,
  queryKeys,
  useGlobalFetcher,
  transformInput,
}: ProductListQueryDefinitionConfig<
  TProduct,
  TListInput,
  TListParams,
  TDetailParams
>) => {
  const resolvedInput = resolveProductQueryInput(input, region)
  const normalizedInput = transformInput
    ? transformInput(resolvedInput)
    : resolvedInput
  const listParams = buildListParams(normalizedInput)
  const globalFetcher =
    useGlobalFetcher === true ? service.getProductsGlobal : undefined
  const queryKey = globalFetcher
    ? appendQueryKey(queryKeys.list(listParams), {
        fetcher: "global",
      })
    : queryKeys.list(listParams)

  return {
    listParams,
    queryFn: async ({ signal }: { signal?: AbortSignal }) =>
      globalFetcher
        ? await globalFetcher(listParams, signal)
        : await service.getProducts(listParams, signal),
    queryKey,
    resolvedInput: normalizedInput,
    useGlobalFetcher: Boolean(globalFetcher),
  }
}

interface ProductDetailQueryDefinitionConfig<
  TProduct,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
> {
  input: TDetailInput
  region?: RegionInfo | null
  service: ProductService<TProduct, TListParams, TDetailParams>
  buildDetailParams: (input: TDetailInput) => TDetailParams
  queryKeys: ProductQueryKeys<TListParams, TDetailParams>
}

export const createProductDetailQueryDefinition = <
  TProduct,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
>({
  input,
  region,
  service,
  buildDetailParams,
  queryKeys,
}: ProductDetailQueryDefinitionConfig<
  TProduct,
  TListParams,
  TDetailInput,
  TDetailParams
>) => {
  const resolvedInput = resolveProductQueryInput(input, region)
  const detailParams = buildDetailParams(resolvedInput)

  return {
    detailParams,
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      if (resolvedInput.handle.length === 0) {
        throw new Error("Product handle is required for product queries")
      }

      return await service.getProductByHandle(detailParams, signal)
    },
    queryKey: queryKeys.detail(detailParams),
    resolvedInput,
  }
}
