import type Medusa from "@medusajs/js-sdk"
import type { FindParams, HttpTypes, SelectParams } from "@medusajs/types"
import { omitKeys, toPlainRecord } from "@techsio/std/object"

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

export interface MedusaCollectionTransformListContext<
  TListParams extends MedusaCollectionListInput,
> {
  params: TListParams
  query: MedusaCollectionListQuery
  response: HttpTypes.StoreCollectionListResponse
}

export interface MedusaCollectionTransformDetailContext<
  TDetailParams extends MedusaCollectionDetailInput,
> {
  params: TDetailParams
  query: MedusaCollectionDetailQuery
  response: HttpTypes.StoreCollectionResponse
}

interface MedusaCollectionServiceConfigBase<
  TListParams extends MedusaCollectionListInput,
  TDetailParams extends MedusaCollectionDetailInput,
> {
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
        collection: HttpTypes.StoreCollection,
      ) => TCollection
      transformListCollection?: (
        collection: HttpTypes.StoreCollection,
        context: MedusaCollectionTransformListContext<TListParams>,
      ) => TCollection
      transformDetailCollection?: (
        collection: HttpTypes.StoreCollection,
        context: MedusaCollectionTransformDetailContext<TDetailParams>,
      ) => TCollection
    }
  | {
      transformCollection?: never
      transformListCollection: (
        collection: HttpTypes.StoreCollection,
        context: MedusaCollectionTransformListContext<TListParams>,
      ) => TCollection
      transformDetailCollection: (
        collection: HttpTypes.StoreCollection,
        context: MedusaCollectionTransformDetailContext<TDetailParams>,
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
        config?:
          | MedusaCollectionServiceConfig<
              TCollection,
              TListParams,
              TDetailParams
            >
          | undefined,
      ]
    : [
        config:
          | MedusaCollectionServiceConfig<
              TCollection,
              TListParams,
              TDetailParams
            >
          | undefined,
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
    Partial<MedusaCollectionTransforms<unknown, TListParams, TDetailParams>>,
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
    const hasDefaultFields =
      defaultListFields !== undefined && defaultListFields.length > 0
    const hasParamFields =
      params.fields !== undefined && params.fields.length > 0
    const query: MedusaCollectionListQuery = normalizeListQuery
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
  ): MedusaCollectionDetailQuery => {
    const hasDefaultFields =
      defaultDetailFields !== undefined && defaultDetailFields.length > 0
    const hasParamFields =
      params.fields !== undefined && params.fields.length > 0
    const query: MedusaCollectionDetailQuery = normalizeDetailQuery
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
    async getCollection(
      params: TDetailParams,
      signal?: AbortSignal,
    ): Promise<unknown> {
      if (params.id === undefined || params.id.length === 0) {
        return null
      }

      const query = buildDetailQuery(params)
      const response =
        await sdk.client.fetch<HttpTypes.StoreCollectionResponse>(
          `${listPath}/${params.id}`,
          {
            query,
            signal: signal ?? null,
          },
        )

      const responseRecord = toPlainRecord(response)
      const { collection: rawCollection } = responseRecord ?? {}
      if (toPlainRecord(rawCollection) === undefined) {
        return null
      }

      const { collection } = response
      return mapDetailCollection(collection, { params, query, response })
    },

    async getCollections(
      params: TListParams,
      signal?: AbortSignal,
    ): Promise<CollectionListResponse<unknown>> {
      const query = buildListQuery(params)
      const response =
        await sdk.client.fetch<HttpTypes.StoreCollectionListResponse>(
          listPath,
          {
            query,
            signal: signal ?? null,
          },
        )

      const collections = (response.collections ?? []).map((collection) =>
        mapListCollection(collection, { params, query, response }),
      )

      return {
        collections,
        count: response.count ?? collections.length,
      }
    },
  }
}
