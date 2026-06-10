import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
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
import { compactRecord } from "../shared/object-utils"

const DEFAULT_PRODUCT_LISTS_PATH = "/store/product-lists"

type PlainQuery = Record<string, unknown>

const normalizeQuantity = (quantity?: number | null) => {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    return undefined
  }

  return Math.max(1, Math.floor(quantity))
}

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

export type MedusaProductListListInput = {
  handle?: string
  type?: string
  limit?: number
  offset?: number
}

export type MedusaProductListDetailInput = {
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

export type MedusaProductListServiceConfig<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends MedusaProductListListInput = MedusaProductListListInput,
> = {
  basePath?: string
  defaultLimit?: number
  defaultOffset?: number
  normalizeListQuery?: (input: TListInput) => PlainQuery
  transformProductList?: (list: ProductListBase<TProductListItem>) => TProductList
  transformProductListItem?: (item: ProductListItemBase) => TProductListItem
  transformCart?: (cart: HttpTypes.StoreCart) => TCart
}

export const normalizeProductListsResponse = <TProductList>(
  response: ProductListListResponse<TProductList>,
  fallbackLimit: number,
  fallbackOffset: number
): ProductListListResult<TProductList> => {
  const productLists =
    response.product_lists ?? response.productLists ?? response.lists ?? []

  return {
    productLists,
    count: response.count ?? productLists.length,
    limit: response.limit ?? fallbackLimit,
    offset: response.offset ?? fallbackOffset,
  }
}

export const resolveProductListFromResponse = <TProductList>(
  response: ProductListResponse<TProductList>
): TProductList | null =>
  response.product_list ?? response.productList ?? response.list ?? null

export const resolveProductListItemFromResponse = <
  TProductList,
  TProductListItem,
>(
  response: ProductListItemResponse<TProductList, TProductListItem>
): TProductListItem | null =>
  response.product_list_item ?? response.productListItem ?? response.item ?? null

export const resolveProductListCartFromResponse = <
  TCart extends ProductListCartLike,
>(
  response: ProductListCartResponse<TCart>
): TCart | null => response.cart ?? null

export function createMedusaProductListService<
  TProductList = ProductListBase<ProductListItemBase>,
  TProductListItem = ProductListItemBase,
  TCart extends ProductListCartLike = HttpTypes.StoreCart,
  TListInput extends MedusaProductListListInput = MedusaProductListListInput,
>(
  sdk: Medusa,
  config?: MedusaProductListServiceConfig<
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
> {
  const basePath = config?.basePath ?? DEFAULT_PRODUCT_LISTS_PATH
  const defaultLimit = config?.defaultLimit ?? 20
  const defaultOffset = config?.defaultOffset ?? 0
  const transformProductList =
    config?.transformProductList ??
    ((list: ProductListBase<TProductListItem>) => list as TProductList)
  const transformProductListItem =
    config?.transformProductListItem ??
    ((item: ProductListItemBase) => item as TProductListItem)
  const transformCart =
    config?.transformCart ??
    ((cart: HttpTypes.StoreCart) => cart as unknown as TCart)

  const mapList = (list: ProductListBase<TProductListItem>) =>
    transformProductList(list)
  const mapItem = (item: ProductListItemBase) => transformProductListItem(item)

  const resolveListQuery = (params: TListInput): PlainQuery => {
    const normalized = config?.normalizeListQuery?.(params) ?? params
    const { limit = defaultLimit, offset = defaultOffset, ...query } = normalized

    return compactRecord({
      ...query,
      limit,
      offset,
    })
  }

  const resolveItemFromResponse = (
    response: ProductListItemResponse<TProductList, ProductListItemBase>
  ): TProductListItem | null => {
    const item = resolveProductListItemFromResponse(response)
    return item ? mapItem(item) : null
  }

  return {
    async listProductLists(
      params: TListInput,
      signal?: AbortSignal
    ): Promise<ProductListListResult<TProductList>> {
      const query = resolveListQuery(params)
      const response = await sdk.client.fetch<
        ProductListListResponse<ProductListBase<TProductListItem>>
      >(basePath, {
        query,
        signal,
      })
      const normalized = normalizeProductListsResponse(
        response,
        Number(query.limit ?? defaultLimit),
        Number(query.offset ?? defaultOffset)
      )

      return {
        ...normalized,
        productLists: normalized.productLists.map(mapList),
      }
    },

    async getProductList(
      params: MedusaProductListDetailInput,
      signal?: AbortSignal
    ): Promise<TProductList | null> {
      if (!params.id) {
        return null
      }

      const response = await sdk.client.fetch<
        ProductListResponse<ProductListBase<TProductListItem>>
      >(`${basePath}/${params.id}`, { signal })

      const productList = resolveProductListFromResponse(response)
      return productList ? mapList(productList) : null
    },

    async createFavoriteProductList(
      input: CreateFavoriteProductListInput = {}
    ): Promise<TProductList | null> {
      const response = await sdk.client.fetch<
        ProductListResponse<ProductListBase<TProductListItem>>
      >(`${basePath}/favorites`, {
        method: "POST",
        body: compactRecord(input),
      })
      const productList = resolveProductListFromResponse(response)
      return productList ? mapList(productList) : null
    },

    async createCustomProductList(
      input: CreateCustomProductListInput
    ): Promise<TProductList | null> {
      const response = await sdk.client.fetch<
        ProductListResponse<ProductListBase<TProductListItem>>
      >(`${basePath}/custom`, {
        method: "POST",
        body: compactRecord({
          ...input,
          access_type: input.access_type ?? "private",
        }),
      })
      const productList = resolveProductListFromResponse(response)
      return productList ? mapList(productList) : null
    },

    async updateProductList(
      input: UpdateProductListInput
    ): Promise<TProductList | null> {
      const response = await sdk.client.fetch<
        ProductListResponse<ProductListBase<TProductListItem>>
      >(`${basePath}/${input.listId}`, {
        method: "POST",
        body: compactRecord({
          title: input.title,
          access_type: input.access_type,
          description: input.description,
          handle: input.handle,
          metadata: input.metadata,
        }),
      })
      const productList = resolveProductListFromResponse(response)
      return productList ? mapList(productList) : null
    },

    deleteProductList(input: DeleteProductListInput) {
      return sdk.client.fetch<ProductListDeleteResponse>(
        `${basePath}/${input.listId}`,
        { method: "DELETE" }
      )
    },

    async addProductListItem(
      input: AddProductListItemInput
    ): Promise<TProductListItem | null> {
      const response = await sdk.client.fetch<
        ProductListItemResponse<TProductList, ProductListItemBase>
      >(`${basePath}/${input.listId}/items`, {
        method: "POST",
        body: compactRecord({
          product_id: input.productId,
          variant_id: input.variantId ?? undefined,
          quantity: normalizeQuantity(input.quantity),
          note: input.note,
          sort_order: input.sortOrder,
          metadata: input.metadata,
        }),
      })

      return resolveItemFromResponse(response)
    },

    async addFavoriteProductListItem(
      input: AddFavoriteProductListItemInput
    ): Promise<TProductListItem | null> {
      const response = await sdk.client.fetch<
        ProductListItemResponse<TProductList, ProductListItemBase>
      >(`${basePath}/favorites/items`, {
        method: "POST",
        body: compactRecord({
          product_id: input.productId,
          variant_id: input.variantId ?? undefined,
          quantity: normalizeQuantity(input.quantity),
          note: input.note,
          sort_order: input.sortOrder,
          metadata: input.metadata,
        }),
      })

      return resolveItemFromResponse(response)
    },

    async createProductListCart(
      input: CreateProductListCartInput
    ): Promise<TCart> {
      const response = await sdk.client.fetch<
        ProductListCartResponse<HttpTypes.StoreCart>
      >(`${basePath}/${input.listId}/cart`, {
        method: "POST",
        body: compactRecord({
          region_id: input.regionId ?? undefined,
          country_code: input.countryCode ?? undefined,
          email: input.email ?? undefined,
          sales_channel_id: input.salesChannelId ?? undefined,
        }),
      })
      const cart = resolveProductListCartFromResponse(response)

      if (!cart) {
        throw new Error("Product list cart response did not include a cart.")
      }

      return transformCart(cart as HttpTypes.StoreCart)
    },

    async updateProductListItem(
      input: UpdateProductListItemInput
    ): Promise<TProductListItem | null> {
      const response = await sdk.client.fetch<
        ProductListItemResponse<TProductList, ProductListItemBase>
      >(`${basePath}/items/${input.itemId}`, {
        method: "POST",
        body: compactRecord({
          quantity: normalizeQuantity(input.quantity),
          note: input.note,
          sort_order: input.sortOrder,
          metadata: input.metadata,
        }),
      })

      return resolveItemFromResponse(response)
    },

    async changeProductListItemQuantity(
      input: ChangeProductListItemQuantityInput
    ): Promise<TProductListItem | null> {
      const response = await sdk.client.fetch<
        ProductListItemResponse<TProductList, ProductListItemBase>
      >(`${basePath}/items/${input.itemId}/change-quantity`, {
        method: "POST",
        body: compactRecord({
          quantity: normalizeQuantityDelta(input.quantity),
        }),
      })

      return resolveItemFromResponse(response)
    },

    async incrementProductListItem(
      input: IncrementProductListItemInput
    ): Promise<TProductListItem | null> {
      const response = await sdk.client.fetch<
        ProductListItemResponse<TProductList, ProductListItemBase>
      >(`${basePath}/items/${input.itemId}/increment`, {
        method: "POST",
        body: compactRecord({
          quantity: normalizeQuantity(input.quantity) ?? 1,
        }),
      })

      return resolveItemFromResponse(response)
    },

    deleteProductListItem(input: DeleteProductListItemInput) {
      const path = input.listId
        ? `${basePath}/${input.listId}/items/${input.itemId}`
        : `${basePath}/items/${input.itemId}`

      return sdk.client.fetch<ProductListDeleteResponse>(path, {
        method: "DELETE",
      })
    },
  }
}
