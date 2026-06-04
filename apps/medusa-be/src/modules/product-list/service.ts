import type { Context, InferTypeOf } from "@medusajs/framework/types"
import {
  kebabCase,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { normalizeTrimmedText } from "../../utils/string"
import { parseInvalidData } from "../../utils/zod"
import {
  DEFAULT_FAVORITE_LIST_HANDLE,
  DEFAULT_FAVORITE_LIST_TITLE,
  PRODUCT_LIST_ACCESS_TYPES,
  PRODUCT_LIST_TYPES,
  type ProductListAccessType,
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

type ProductListRecord = InferTypeOf<typeof ProductList>
type ProductListItemRecord = InferTypeOf<typeof ProductListItem>

const productListAccessTypeSchema = z
  .enum(PRODUCT_LIST_ACCESS_TYPES)
  .optional()
  .default("private")
const productListTypeSchema = z.enum(PRODUCT_LIST_TYPES)
const positiveIntegerSchema = (field: string) =>
  z
    .number()
    .int(`${field} must be a positive integer`)
    .min(1, `${field} must be a positive integer`)
    .optional()
    .default(1)
const nonNegativeIntegerSchema = (field: string) =>
  z
    .number()
    .int(`${field} must be a non-negative integer`)
    .min(0, `${field} must be a non-negative integer`)
    .optional()
    .default(0)

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
        access_type: parseInvalidData(
          productListAccessTypeSchema,
          input.access_type
        ),
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
    const listType = parseInvalidData(productListTypeSchema, input.list_type)
    const quantity =
      listType === "favorite"
        ? 1
        : parseInvalidData(positiveIntegerSchema("quantity"), input.quantity)

    return await this.createProductListItems(
      {
        list_id: input.list_id,
        quantity,
        note: input.note ?? null,
        sort_order: parseInvalidData(
          nonNegativeIntegerSchema("sort_order"),
          input.sort_order
        ),
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
    const incrementBy = parseInvalidData(
      positiveIntegerSchema("quantityToAdd"),
      quantityToAdd
    )
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

  async assertListSupportsQuantityIncrement(
    listId: string,
    sharedContext?: Context
  ) {
    const list: ProductListRecord = await this.retrieveProductList(
      listId,
      {},
      sharedContext
    )
    const listType = parseInvalidData(productListTypeSchema, list.type)

    if (listType !== "custom") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only custom product lists support quantity increments"
      )
    }

    return list
  }
}

export default ProductListModuleService
