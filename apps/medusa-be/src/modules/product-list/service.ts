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

export type UpdateCustomProductListDTO = {
  title?: string
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

export type UpdateProductListItemDTO = {
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

  async updateCustomProductList(
    listId: string,
    input: UpdateCustomProductListDTO,
    sharedContext?: Context
  ) {
    const productList = await this.retrieveProductList(
      listId,
      {},
      sharedContext
    )
    const productListType = normalizeProductListType(productList.type)

    if (productListType !== "custom") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only custom product lists can be updated"
      )
    }

    const data: UpdateCustomProductListDTO & { id: string } = { id: listId }

    if (input.title !== undefined) {
      const title = input.title.trim()

      if (!title) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Product list title is required"
        )
      }

      data.title = title
    }

    if (input.handle !== undefined) {
      const handle = input.handle.trim()
      data.handle =
        handle === ""
          ? kebabCase(data.title ?? productList.title)
          : kebabCase(handle)
    }

    if (input.access_type !== undefined) {
      data.access_type = normalizeProductListAccessType(input.access_type)
    }

    if (input.description !== undefined) {
      data.description = input.description
    }

    if (input.metadata !== undefined) {
      data.metadata = input.metadata
    }

    return await this.updateProductLists(data, sharedContext)
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

  async decrementProductListItemQuantity(
    itemId: string,
    quantityToSubtract = 1,
    sharedContext?: Context
  ) {
    const decrementBy = normalizePositiveInteger(
      "quantityToSubtract",
      quantityToSubtract
    )
    const item: ProductListItemRecord = await this.retrieveProductListItem(
      itemId,
      {},
      sharedContext
    )
    const quantity = item.quantity - decrementBy

    if (quantity < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Quantity cannot be decremented below 1"
      )
    }

    return await this.updateProductListItems(
      {
        id: itemId,
        quantity,
      },
      sharedContext
    )
  }

  async updateProductListItemForList(
    itemId: string,
    input: UpdateProductListItemDTO,
    sharedContext?: Context
  ) {
    const data: UpdateProductListItemDTO & { id: string } = { id: itemId }

    if (input.quantity !== undefined) {
      data.quantity = normalizePositiveInteger("quantity", input.quantity)
    }

    if (input.note !== undefined) {
      data.note = input.note
    }

    if (input.sort_order !== undefined) {
      data.sort_order = normalizeNonNegativeInteger(
        "sort_order",
        input.sort_order
      )
    }

    if (input.metadata !== undefined) {
      data.metadata = input.metadata
    }

    return await this.updateProductListItems(data, sharedContext)
  }
}

export default ProductListModuleService
