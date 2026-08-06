import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { compactRecord, isRecord } from "@techsio/std/object"

import type { IsExactly } from "../shared/type-utils"
import type {
  AddFavoriteProductListItemInput,
  AddProductListItemInput,
  ChangeProductListItemQuantityInput,
  CreateCustomProductListInput,
  CreateFavoriteProductListInput,
  CreateProductListCartInput,
  DeleteProductListInput,
  DeleteProductListItemInput,
  IncrementProductListItemInput,
  ProductListBase,
  ProductListCartLike,
  ProductListCartResponse,
  ProductListDeleteResponse,
  ProductListItemBase,
  ProductListItemResponse,
  ProductListListResponse,
  ProductListListResult,
  ProductListResponse,
  ProductListService,
  UpdateProductListInput,
  UpdateProductListItemInput,
} from "./types"

const DEFAULT_PRODUCT_LISTS_PATH = "/store/product-lists"

type PlainQuery = Record<string, unknown>
type UnknownTransform = (value: unknown) => unknown

const isUnknownTransform = (value: unknown): value is UnknownTransform =>
  typeof value === "function"

const normalizeQuantity = (quantity?: number | null): number | undefined =>
  typeof quantity !== "number" || !Number.isFinite(quantity)
    ? undefined
    : Math.max(1, Math.floor(quantity))

const normalizeQuantityDelta = (quantity?: number | null) => {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    return 1
  }

  const quantityDelta = Math.trunc(quantity)

  if (quantityDelta === 0) {
    throw new Error("Quantity change must be a non-zero integer.")
  }

  return quantityDelta
}

export interface MedusaProductListListInput {
  handle?: string
  type?: string
  limit?: number
  offset?: number
}

export interface MedusaProductListDetailInput {
  id?: string | null
}

export type MedusaProductListListHookInput = MedusaProductListListInput & {
  page?: number
  customerId?: string | null
  enabled?: boolean
}

export type MedusaProductListDetailHookInput = MedusaProductListDetailInput & {
  customerId?: string | null
  enabled?: boolean
}

export type MedusaProductListListKeyInput = MedusaProductListListInput & {
  customerId?: string | null
}

export type MedusaProductListDetailKeyInput = MedusaProductListDetailInput & {
  customerId?: string | null
}

interface MedusaProductListServiceConfigBase<
  TListInput extends MedusaProductListListInput,
> {
  basePath?: string
  defaultLimit?: number
  defaultOffset?: number
  normalizeListQuery?: ((input: TListInput) => PlainQuery) | undefined
}

type MedusaProductListTransform<TProductList, TProductListItem> =
  IsExactly<TProductList, ProductListBase> extends true
    ? IsExactly<TProductListItem, ProductListItemBase> extends true
      ? {
          transformProductList?: (
            list: ProductListBase<TProductListItem>,
          ) => TProductList
        }
      : {
          transformProductList: (
            list: ProductListBase<TProductListItem>,
          ) => TProductList
        }
    : {
        transformProductList: (
          list: ProductListBase<TProductListItem>,
        ) => TProductList
      }

type MedusaProductListItemTransform<TProductListItem> =
  IsExactly<TProductListItem, ProductListItemBase> extends true
    ? {
        transformProductListItem?: (
          item: ProductListItemBase,
        ) => TProductListItem
      }
    : {
        transformProductListItem: (
          item: ProductListItemBase,
        ) => TProductListItem
      }

type MedusaProductListCartTransform<TCart extends ProductListCartLike> =
  IsExactly<TCart, HttpTypes.StoreCart> extends true
    ? { transformCart?: (cart: HttpTypes.StoreCart) => TCart }
    : { transformCart: (cart: HttpTypes.StoreCart) => TCart }

export type MedusaProductListServiceConfig<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends MedusaProductListListInput = MedusaProductListListInput,
> = MedusaProductListServiceConfigBase<TListInput> &
  MedusaProductListTransform<TProductList, TProductListItem> &
  MedusaProductListItemTransform<TProductListItem> &
  MedusaProductListCartTransform<TCart>

export const normalizeProductListsResponse = <TProductList>(
  response: ProductListListResponse<TProductList>,
  fallbackLimit: number,
  fallbackOffset: number,
): ProductListListResult<TProductList> => {
  const productLists =
    response.product_lists ?? response.productLists ?? response.lists ?? []

  return {
    count: response.count ?? productLists.length,
    limit: response.limit ?? fallbackLimit,
    offset: response.offset ?? fallbackOffset,
    productLists,
  }
}

export const resolveProductListFromResponse = <TProductList>(
  response: ProductListResponse<TProductList>,
): TProductList | null =>
  response.product_list ?? response.productList ?? response.list ?? null

export const resolveProductListItemFromResponse = <
  TProductList,
  TProductListItem,
>(
  response: ProductListItemResponse<TProductList, TProductListItem>,
): TProductListItem | null =>
  response.product_list_item ??
  response.productListItem ??
  response.item ??
  null

export const resolveProductListCartFromResponse = <
  TCart extends ProductListCartLike,
>(
  response: ProductListCartResponse<TCart>,
): TCart | null => response.cart ?? null

type MedusaProductListServiceArgs<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends MedusaProductListListInput,
> =
  IsExactly<TProductList, ProductListBase> extends true
    ? IsExactly<TProductListItem, ProductListItemBase> extends true
      ? IsExactly<TCart, HttpTypes.StoreCart> extends true
        ? [
            config?:
              | MedusaProductListServiceConfig<
                  TProductList,
                  TProductListItem,
                  TCart,
                  TListInput
                >
              | undefined,
          ]
        : [
            config: MedusaProductListServiceConfig<
              TProductList,
              TProductListItem,
              TCart,
              TListInput
            >,
          ]
      : [
          config: MedusaProductListServiceConfig<
            TProductList,
            TProductListItem,
            TCart,
            TListInput
          >,
        ]
    : [
        config: MedusaProductListServiceConfig<
          TProductList,
          TProductListItem,
          TCart,
          TListInput
        >,
      ]

class MedusaProductListServiceFactory {
  private readonly defaultBasePath = DEFAULT_PRODUCT_LISTS_PATH
  create<
    TProductList = ProductListBase,
    TProductListItem = ProductListItemBase,
    TCart extends ProductListCartLike = HttpTypes.StoreCart,
    TListInput extends MedusaProductListListInput = MedusaProductListListInput,
  >(
    sdk: Medusa,
    ...[config]: MedusaProductListServiceArgs<
      TProductList,
      TProductListItem,
      TCart,
      TListInput
    >
  ): ProductListService<
    TProductList,
    TProductListItem,
    TCart,
    TListInput,
    MedusaProductListDetailInput
  >
  create(
    sdk: Medusa,
    config?: unknown,
  ): ProductListService<
    unknown,
    unknown,
    ProductListCartLike,
    MedusaProductListListInput,
    MedusaProductListDetailInput
  > {
    const configRecord = isRecord(config) ? config : {}
    const {
      basePath: basePathValue,
      defaultLimit: defaultLimitValue,
      defaultOffset: defaultOffsetValue,
      normalizeListQuery,
      transformCart,
      transformProductList,
      transformProductListItem,
    } = configRecord
    const basePath =
      typeof basePathValue === "string" ? basePathValue : this.defaultBasePath
    const defaultLimit =
      typeof defaultLimitValue === "number" ? defaultLimitValue : 20
    const defaultOffset =
      typeof defaultOffsetValue === "number" ? defaultOffsetValue : 0

    const mapList = (list: ProductListBase<unknown>): unknown =>
      isUnknownTransform(transformProductList)
        ? transformProductList(list)
        : list
    const mapItem = (item: ProductListItemBase): unknown =>
      isUnknownTransform(transformProductListItem)
        ? transformProductListItem(item)
        : item
    const mapCart = (cart: HttpTypes.StoreCart): ProductListCartLike => {
      if (!isUnknownTransform(transformCart)) {
        return cart
      }
      const transformedCart: unknown = transformCart(cart)
      if (!isRecord(transformedCart)) {
        throw new TypeError("Product list cart transform must return a cart")
      }
      const { id } = transformedCart
      if (typeof id !== "string") {
        throw new TypeError("Product list cart transform must return a cart")
      }
      return { ...transformedCart, id }
    }

    const resolveListQuery = (
      params: MedusaProductListListInput,
    ): PlainQuery => {
      const normalizedResult = isUnknownTransform(normalizeListQuery)
        ? normalizeListQuery(params)
        : params
      const normalized = isRecord(normalizedResult) ? normalizedResult : params
      const {
        limit = defaultLimit,
        offset = defaultOffset,
        ...query
      } = normalized

      return compactRecord({
        ...query,
        limit,
        offset,
      })
    }

    const resolveItemFromResponse = (
      response: ProductListItemResponse<
        ProductListBase<unknown>,
        ProductListItemBase
      >,
    ): unknown => {
      const item = resolveProductListItemFromResponse(response)
      return item === null ? null : mapItem(item)
    }

    return {
      async addFavoriteProductListItem(
        input: AddFavoriteProductListItemInput,
      ): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListItemResponse<ProductListBase<unknown>, ProductListItemBase>
        >(`${basePath}/favorites/items`, {
          body: compactRecord({
            metadata: input.metadata,
            note: input.note,
            product_id: input.productId,
            quantity: normalizeQuantity(input.quantity),
            sort_order: input.sortOrder,
            variant_id: input.variantId ?? undefined,
          }),
          method: "POST",
        })

        return resolveItemFromResponse(response)
      },

      async addProductListItem(
        input: AddProductListItemInput,
      ): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListItemResponse<ProductListBase<unknown>, ProductListItemBase>
        >(`${basePath}/${input.listId}/items`, {
          body: compactRecord({
            metadata: input.metadata,
            note: input.note,
            product_id: input.productId,
            quantity: normalizeQuantity(input.quantity),
            sort_order: input.sortOrder,
            variant_id: input.variantId ?? undefined,
          }),
          method: "POST",
        })

        return resolveItemFromResponse(response)
      },

      async changeProductListItemQuantity(
        input: ChangeProductListItemQuantityInput,
      ): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListItemResponse<ProductListBase<unknown>, ProductListItemBase>
        >(`${basePath}/items/${input.itemId}/change-quantity`, {
          body: compactRecord({
            quantity: normalizeQuantityDelta(input.quantity),
          }),
          method: "POST",
        })

        return resolveItemFromResponse(response)
      },

      async createCustomProductList(
        input: CreateCustomProductListInput,
      ): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListResponse<ProductListBase<unknown>>
        >(`${basePath}/custom`, {
          body: compactRecord({
            ...input,
            access_type: input.access_type ?? "private",
          }),
          method: "POST",
        })
        const productList = resolveProductListFromResponse(response)
        return productList === null ? null : mapList(productList)
      },

      async createFavoriteProductList(
        input: CreateFavoriteProductListInput = {},
      ): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListResponse<ProductListBase<unknown>>
        >(`${basePath}/favorites`, {
          body: compactRecord({ ...input }),
          method: "POST",
        })
        const productList = resolveProductListFromResponse(response)
        return productList === null ? null : mapList(productList)
      },

      async createProductListCart(
        input: CreateProductListCartInput,
      ): Promise<ProductListCartLike> {
        const response = await sdk.client.fetch<
          ProductListCartResponse<HttpTypes.StoreCart>
        >(`${basePath}/${input.listId}/cart`, {
          body: compactRecord({
            country_code: input.countryCode ?? undefined,
            email: input.email ?? undefined,
            region_id: input.regionId ?? undefined,
            sales_channel_id: input.salesChannelId ?? undefined,
          }),
          method: "POST",
        })
        const cart = resolveProductListCartFromResponse(response)

        if (cart === null) {
          throw new Error("Product list cart response did not include a cart.")
        }

        return mapCart(cart)
      },

      async deleteProductList(input: DeleteProductListInput) {
        return await sdk.client.fetch<ProductListDeleteResponse>(
          `${basePath}/${input.listId}`,
          {
            method: "DELETE",
          },
        )
      },

      async deleteProductListItem(input: DeleteProductListItemInput) {
        const path =
          input.listId === undefined || input.listId.length === 0
            ? `${basePath}/items/${input.itemId}`
            : `${basePath}/${input.listId}/items/${input.itemId}`

        return await sdk.client.fetch<ProductListDeleteResponse>(path, {
          method: "DELETE",
        })
      },

      async getProductList(
        params: MedusaProductListDetailInput,
        signal?: AbortSignal,
      ): Promise<unknown> {
        if (
          params.id === undefined ||
          params.id === null ||
          params.id.length === 0
        ) {
          return null
        }

        const response = await sdk.client.fetch<
          ProductListResponse<ProductListBase<unknown>>
        >(`${basePath}/${params.id}`, { signal: signal ?? null })

        const productList = resolveProductListFromResponse(response)
        return productList === null ? null : mapList(productList)
      },

      async incrementProductListItem(
        input: IncrementProductListItemInput,
      ): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListItemResponse<ProductListBase<unknown>, ProductListItemBase>
        >(`${basePath}/items/${input.itemId}/increment`, {
          body: compactRecord({
            quantity: normalizeQuantity(input.quantity) ?? 1,
          }),
          method: "POST",
        })

        return resolveItemFromResponse(response)
      },

      async listProductLists(
        params: MedusaProductListListInput,
        signal?: AbortSignal,
      ): Promise<ProductListListResult<unknown>> {
        const query = resolveListQuery(params)
        const response = await sdk.client.fetch<
          ProductListListResponse<ProductListBase<unknown>>
        >(basePath, {
          query,
          signal: signal ?? null,
        })
        const { limit: queryLimit, offset: queryOffset } = query
        const normalized = normalizeProductListsResponse(
          response,
          Number(queryLimit ?? defaultLimit),
          Number(queryOffset ?? defaultOffset),
        )

        return {
          ...normalized,
          productLists: normalized.productLists.map(mapList),
        }
      },

      async updateProductList(input: UpdateProductListInput): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListResponse<ProductListBase<unknown>>
        >(`${basePath}/${input.listId}`, {
          body: compactRecord({
            access_type: input.access_type,
            description: input.description,
            handle: input.handle,
            metadata: input.metadata,
            title: input.title,
          }),
          method: "POST",
        })
        const productList = resolveProductListFromResponse(response)
        return productList === null ? null : mapList(productList)
      },

      async updateProductListItem(
        input: UpdateProductListItemInput,
      ): Promise<unknown> {
        const response = await sdk.client.fetch<
          ProductListItemResponse<ProductListBase<unknown>, ProductListItemBase>
        >(`${basePath}/items/${input.itemId}`, {
          body: compactRecord({
            metadata: input.metadata,
            note: input.note,
            quantity: normalizeQuantity(input.quantity),
            sort_order: input.sortOrder,
          }),
          method: "POST",
        })

        return resolveItemFromResponse(response)
      },
    }
  }
}

const medusaProductListServiceFactory = new MedusaProductListServiceFactory()

export const createMedusaProductListService =
  medusaProductListServiceFactory.create.bind(medusaProductListServiceFactory)
