import type { Context } from "@medusajs/framework/types"
import {
  kebabCase,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import {
  DEFAULT_FAVORITE_LIST_HANDLE,
  DEFAULT_FAVORITE_LIST_TITLE,
  PRODUCT_LIST_TYPES,
  type ProductListType,
} from "./constants"
import ProductList from "./models/product-list"
import ProductListItem from "./models/product-list-item"

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

type ProductListRecord = {
  id: string
  type: ProductListType
}

type ProductListItemRecord = {
  id: string
  quantity: number
}

const isProductListType = (type: string): type is ProductListType =>
  PRODUCT_LIST_TYPES.includes(type as ProductListType)

const assertProductListType = (type: string): ProductListType => {
  if (isProductListType(type)) {
    return type
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported product list type: ${type}`
  )
}

const normalizePositiveInteger = (value: number | undefined, field: string) => {
  const normalized = value ?? 1

  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${field} must be a positive integer`
    )
  }

  return normalized
}

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
        title: input.title?.trim() || DEFAULT_FAVORITE_LIST_TITLE,
        handle: input.handle?.trim() || DEFAULT_FAVORITE_LIST_HANDLE,
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

    return await this.createProductLists(
      {
        title,
        handle: input.handle?.trim() || kebabCase(title),
        type: "custom",
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
    const listType = assertProductListType(input.list_type)
    const quantity =
      listType === "favorite"
        ? 1
        : normalizePositiveInteger(input.quantity, "quantity")

    return await this.createProductListItems(
      {
        list_id: input.list_id,
        quantity,
        note: input.note ?? null,
        sort_order: input.sort_order ?? 0,
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
    const incrementBy = normalizePositiveInteger(quantityToAdd, "quantityToAdd")
    const item = (await this.retrieveProductListItem(
      itemId,
      {},
      sharedContext
    )) as ProductListItemRecord

    return await this.updateProductListItems(
      {
        id: itemId,
        quantity: item.quantity + incrementBy,
      },
      sharedContext
    )
  }

  async assertListSupportsQuantityIncrement(
    listId: string,
    sharedContext?: Context
  ) {
    const list = (await this.retrieveProductList(
      listId,
      {},
      sharedContext
    )) as ProductListRecord

    if (list.type !== "custom") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only custom product lists support quantity increments"
      )
    }

    return list
  }
}

export default ProductListModuleService
