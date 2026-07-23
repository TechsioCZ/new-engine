import type Medusa from "@medusajs/js-sdk"
import type { FindParams, HttpTypes, SelectParams } from "@medusajs/types"

import type { IsExactly } from "../shared/type-utils"
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

type MedusaCollectionServiceConfigBase<
  TListParams extends MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput,
> = {
  listPath?: string
  defaultListFields?: string
  defaultDetailFields?: string
  normalizeListQuery?: (params: TListParams) => MedusaCollectionListQuery
  normalizeDetailQuery?: (params: TDetailParams) => MedusaCollectionDetailQuery
}

type MedusaCollectionTransforms<
  TCollection,
  TListParams extends MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput,
> =
  | {
      transformCollection: (
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
  | {
      transformCollection?: never
      transformListCollection: (
        collection: HttpTypes.StoreCollection,
        context: MedusaCollectionTransformListContext<TListParams>
      ) => TCollection
      transformDetailCollection: (
        collection: HttpTypes.StoreCollection,
        context: MedusaCollectionTransformDetailContext<TDetailParams>
      ) => TCollection
    }

export type MedusaCollectionServiceConfig<
  TCollection,
  TListParams extends MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput,
> = MedusaCollectionServiceConfigBase<TListParams, TDetailParams> &
  (IsExactly<TCollection, HttpTypes.StoreCollection> extends true
    ? Partial<
        MedusaCollectionTransforms<TCollection, TListParams, TDetailParams>
      >
    : MedusaCollectionTransforms<TCollection, TListParams, TDetailParams>)

const stripEnabled = <TQuery extends Record<string, unknown>>(
  query: TQuery
): Omit<TQuery, "enabled"> => {
  const { enabled: _enabled, ...rest } = query as TQuery & {
    enabled?: unknown
  }
  return rest
}

/**
 * Creates a CollectionService for Medusa Store API.
 *
 * Uses `/store/collections` through `sdk.client.fetch` so query cancellation
 * works with `AbortSignal` passed by TanStack Query.
 */
type MedusaCollectionServiceArgs<
  TCollection,
  TListParams extends MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput,
> =
  IsExactly<TCollection, HttpTypes.StoreCollection> extends true
    ? [
        config?: MedusaCollectionServiceConfig<
          TCollection,
          TListParams,
          TDetailParams
        >,
      ]
    : [
        config: MedusaCollectionServiceConfig<
          TCollection,
          TListParams,
          TDetailParams
        >,
      ]

export function createMedusaCollectionService<
  TCollection = HttpTypes.StoreCollection,
  TListParams extends MedusaCollectionListInput = MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput =
    MedusaCollectionDetailInput,
>(
  sdk: Medusa,
  ...[config]: MedusaCollectionServiceArgs<
    TCollection,
    TListParams,
    TDetailParams
  >
): CollectionService<TCollection, TListParams, TDetailParams>
export function createMedusaCollectionService<
  TListParams extends MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput,
>(
  sdk: Medusa,
  config?: MedusaCollectionServiceConfigBase<TListParams, TDetailParams> &
    Partial<MedusaCollectionTransforms<unknown, TListParams, TDetailParams>>
): CollectionService<unknown, TListParams, TDetailParams> {
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
    ((collection: HttpTypes.StoreCollection): unknown => collection)

  const mapListCollection =
    transformListCollection ??
    ((collection: HttpTypes.StoreCollection) => baseTransform(collection))

  const mapDetailCollection =
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

    return stripEnabled(query) as MedusaCollectionListQuery
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
    return stripEnabled(withoutId) as MedusaCollectionDetailQuery
  }

  return {
    async getCollections(
      params: TListParams,
      signal?: AbortSignal
    ): Promise<CollectionListResponse<unknown>> {
      const query = buildListQuery(params)
      const response =
        await sdk.client.fetch<HttpTypes.StoreCollectionListResponse>(
          listPath,
          {
            query,
            signal: signal ?? null,
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
    ): Promise<unknown> {
      if (!params.id) {
        return null
      }

      const query = buildDetailQuery(params)
      const response =
        await sdk.client.fetch<HttpTypes.StoreCollectionResponse>(
          `${listPath}/${params.id}`,
          {
            query,
            signal: signal ?? null,
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
