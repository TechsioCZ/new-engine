import type Medusa from "@medusajs/js-sdk"
import type { FindParams, HttpTypes, SelectParams } from "@medusajs/types"
import type { CollectionListResponse, CollectionService } from "./types"

type MedusaCollectionListQuery = FindParams &
  HttpTypes.StoreCollectionListParams &
  Record<string, unknown>

type MedusaCollectionDetailQuery = SelectParams & Record<string, unknown>

export type MedusaCollectionListInput = FindParams &
  HttpTypes.StoreCollectionListParams & {
    enabled?: boolean
  }

export type MedusaCollectionDetailInput = SelectParams & {
  id?: string
  enabled?: boolean
}

export type MedusaCollectionTransformListContext<
  TListParams extends MedusaCollectionListInput,
> = {
  params: TListParams
  query: MedusaCollectionListQuery
  response: HttpTypes.StoreCollectionListResponse
}

export type MedusaCollectionTransformDetailContext<
  TDetailParams extends MedusaCollectionDetailInput,
> = {
  params: TDetailParams
  query: MedusaCollectionDetailQuery
  response: HttpTypes.StoreCollectionResponse
}

export type MedusaCollectionServiceConfig<
  TCollection,
  TListParams extends MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput,
> = {
  listPath?: string
  defaultListFields?: string
  defaultDetailFields?: string
  normalizeListQuery?: (params: TListParams) => MedusaCollectionListQuery
  normalizeDetailQuery?: (params: TDetailParams) => MedusaCollectionDetailQuery
  transformCollection?: (
    collection: HttpTypes.StoreCollection
  ) => TCollection
  transformListCollection?: (
    collection: HttpTypes.StoreCollection,
    context: MedusaCollectionTransformListContext<TListParams>
  ) => TCollection
  transformDetailCollection?: (
    collection: HttpTypes.StoreCollection,
    context: MedusaCollectionTransformDetailContext<TDetailParams>
  ) => TCollection
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
 * Creates a CollectionService for Medusa Store API.
 *
 * Uses `/store/collections` through `sdk.client.fetch` so query cancellation
 * works with `AbortSignal` passed by TanStack Query.
 */
export function createMedusaCollectionService<
  TCollection = HttpTypes.StoreCollection,
  TListParams extends MedusaCollectionListInput = MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput = MedusaCollectionDetailInput,
>(
  sdk: Medusa,
  config?: MedusaCollectionServiceConfig<
    TCollection,
    TListParams,
    TDetailParams
  >
): CollectionService<TCollection, TListParams, TDetailParams> {
  const {
    listPath = "/store/collections",
    defaultListFields,
    defaultDetailFields,
    normalizeListQuery,
    normalizeDetailQuery,
    transformCollection,
    transformListCollection,
    transformDetailCollection,
  } = config ?? {}

  const baseTransform =
    transformCollection ??
    ((collection) => collection as unknown as TCollection)

  const mapListCollection: (
    collection: HttpTypes.StoreCollection,
    context: MedusaCollectionTransformListContext<TListParams>
  ) => TCollection =
    transformListCollection ??
    ((collection: HttpTypes.StoreCollection) => baseTransform(collection))

  const mapDetailCollection: (
    collection: HttpTypes.StoreCollection,
    context: MedusaCollectionTransformDetailContext<TDetailParams>
  ) => TCollection =
    transformDetailCollection ??
    ((collection: HttpTypes.StoreCollection) => baseTransform(collection))

  const buildListQuery = (params: TListParams): MedusaCollectionListQuery => {
    const query = normalizeListQuery
      ? normalizeListQuery(params)
      : ({
          ...params,
          ...(defaultListFields && !params.fields
            ? { fields: defaultListFields }
            : {}),
        } as MedusaCollectionListQuery)

    return stripEnabled(query)
  }

  const buildDetailQuery = (
    params: TDetailParams
  ): MedusaCollectionDetailQuery => {
    const query = normalizeDetailQuery
      ? normalizeDetailQuery(params)
      : ({
          ...params,
          ...(defaultDetailFields && !params.fields
            ? { fields: defaultDetailFields }
            : {}),
        } as MedusaCollectionDetailQuery)

    const { id: _id, ...withoutId } = query as MedusaCollectionDetailQuery & {
      id?: string
    }
    return stripEnabled(withoutId)
  }

  return {
    async getCollections(
      params: TListParams,
      signal?: AbortSignal
    ): Promise<CollectionListResponse<TCollection>> {
      const query = buildListQuery(params)
      const response = await sdk.client.fetch<HttpTypes.StoreCollectionListResponse>(
        listPath,
        {
          query,
          signal,
        }
      )

      const collections = (response.collections ?? []).map((collection) =>
        mapListCollection(collection, { params, query, response })
      )

      return {
        collections,
        count: response.count ?? collections.length,
      }
    },

    async getCollection(
      params: TDetailParams,
      signal?: AbortSignal
    ): Promise<TCollection | null> {
      if (!params.id) {
        return null
      }

      const query = buildDetailQuery(params)
      const response = await sdk.client.fetch<HttpTypes.StoreCollectionResponse>(
        `${listPath}/${params.id}`,
        {
          query,
          signal,
        }
      )

      const collection = response.collection
      if (!collection) {
        return null
      }

      return mapDetailCollection(collection, { params, query, response })
    },
  }
}
