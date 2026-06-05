import type { Context, InferTypeOf } from "@medusajs/framework/types"
import {
  kebabCase,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import { normalizeTrimmedText } from "../../utils/string"
import {
  DEFAULT_FAVORITE_LIST_HANDLE,
  DEFAULT_FAVORITE_LIST_TITLE,
  type ProductListAccessType,
  type ProductListType,
} from "./constants"
import ProductList from "./models/product-list"
import ProductListItem from "./models/product-list-item"
import {
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
  normalizeProductListAccessType,
  normalizeProductListType,
} from "./normalizers"

export type ProductListMetadata = Record<string, unknown>

export type CreateFavoriteProductListDTO = {
  title?: string
  handle?: string
  description?: string | null
  metadata?: ProductListMetadata | null
}

export type CreateCustomProductListDTO = {
  title: string
  handle?: string
  access_type?: ProductListAccessType
  description?: string | null
  metadata?: ProductListMetadata | null
}

export type CreateProductListItemDTO = {
  list_id: string
  list_type: ProductListType
  quantity?: number
  note?: string | null
  sort_order?: number
  metadata?: ProductListMetadata | null
}

type ProductListItemRecord = InferTypeOf<typeof ProductListItem>

class ProductListModuleService extends MedusaService({
  ProductList,
  ProductListItem,
}) {
  async createFavoriteProductList(
    input: CreateFavoriteProductListDTO = {},
    sharedContext?: Context
  ) {
    return await this.createProductLists(
      {
        title: normalizeTrimmedText(input.title, DEFAULT_FAVORITE_LIST_TITLE),
        handle: normalizeTrimmedText(
          input.handle,
          DEFAULT_FAVORITE_LIST_HANDLE
        ),
        type: "favorite",
        description: input.description ?? null,
        metadata: input.metadata ?? null,
      },
      sharedContext
    )
  }

  async createCustomProductList(
    input: CreateCustomProductListDTO,
    sharedContext?: Context
  ) {
    const title = input.title.trim()

    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product list title is required"
      )
    }
    const trimmedHandle = input.handle?.trim()
    const handle =
      trimmedHandle == null || trimmedHandle === ""
        ? kebabCase(title)
        : kebabCase(trimmedHandle)

    return await this.createProductLists(
      {
        title,
        handle,
        type: "custom",
        access_type: normalizeProductListAccessType(input.access_type),
        description: input.description ?? null,
        metadata: input.metadata ?? null,
      },
      sharedContext
    )
  }

  async createProductListItemForList(
    input: CreateProductListItemDTO,
    sharedContext?: Context
  ) {
    const listType = normalizeProductListType(input.list_type)
    const quantity =
      listType === "favorite"
        ? 1
        : normalizePositiveInteger("quantity", input.quantity)

    return await this.createProductListItems(
      {
        list_id: input.list_id,
        quantity,
        note: input.note ?? null,
        sort_order: normalizeNonNegativeInteger("sort_order", input.sort_order),
        metadata: input.metadata ?? null,
      },
      sharedContext
    )
  }

  async incrementProductListItemQuantity(
    itemId: string,
    quantityToAdd = 1,
    sharedContext?: Context
  ) {
    const incrementBy = normalizePositiveInteger("quantityToAdd", quantityToAdd)
    const item: ProductListItemRecord = await this.retrieveProductListItem(
      itemId,
      {},
      sharedContext
    )

    return await this.updateProductListItems(
      {
        id: itemId,
        quantity: item.quantity + incrementBy,
      },
      sharedContext
    )
  }
}

export default ProductListModuleService
