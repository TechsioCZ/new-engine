import type { Link } from "@medusajs/framework/modules-sdk"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { CustomerProductListLink } from "../../../links/customer-product-list"
import { ProductListItemProductLink } from "../../../links/product-list-item-product"
import { ProductListItemVariantLink } from "../../../links/product-list-item-variant"
import {
  PRODUCT_LIST_MODULE,
  PRODUCT_LIST_TYPES,
  type ProductListType,
} from "../../../modules/product-list/constants"
import type {
  CreateCustomProductListDTO,
  CreateFavoriteProductListDTO,
  CreateProductListItemDTO,
} from "../../../modules/product-list/service"
import type { ProductListItemRecord, ProductListRecord } from "../types"

type CustomerProductListLinkRecord = {
  customer_id?: string
  product_list_id?: string
}

type ProductListItemProductLinkRecord = {
  product_id?: string
  product_list_item_id?: string
}

type ProductListItemVariantLinkRecord = {
  product_variant_id?: string
  product_list_item_id?: string
}

export type ProductListService = {
  assertListSupportsQuantityIncrement: (listId: string) => Promise<unknown>
  createCustomProductList: (
    input: CreateCustomProductListDTO
  ) => Promise<ProductListRecord>
  createFavoriteProductList: (
    input?: CreateFavoriteProductListDTO
  ) => Promise<ProductListRecord>
  createProductListItemForList: (
    input: CreateProductListItemDTO
  ) => Promise<ProductListItemRecord>
  deleteProductListItems: (ids: string | string[]) => Promise<void>
  deleteProductLists: (ids: string | string[]) => Promise<void>
  incrementProductListItemQuantity: (
    itemId: string,
    quantityToAdd?: number
  ) => Promise<ProductListItemRecord>
  listAndCountProductLists: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[ProductListRecord[], number]>
  listProductListItems: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductListItemRecord[]>
  listProductLists: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductListRecord[]>
  retrieveProductList: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<ProductListRecord>
  retrieveProductListItem: (
    id: string,
    config?: Record<string, unknown>
  ) => Promise<ProductListItemRecord>
  updateProductListItems: (input: {
    id: string
    quantity: number
  }) => Promise<ProductListItemRecord>
}

export const getProductListService = (container: MedusaContainer) =>
  container.resolve<ProductListService>(PRODUCT_LIST_MODULE)

export const getProductListType = (type: string): ProductListType => {
  if (PRODUCT_LIST_TYPES.includes(type as ProductListType)) {
    return type as ProductListType
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported product list type: ${type}`
  )
}

export const listCustomerProductListIds = async (
  container: MedusaContainer,
  customerId: string
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: CustomerProductListLink.entryPoint,
    fields: ["product_list_id"],
    filters: {
      customer_id: customerId,
    },
  })

  return (data as CustomerProductListLinkRecord[]).flatMap((link) =>
    link.product_list_id ? [link.product_list_id] : []
  )
}

export const findCustomerFavoriteProductList = async (
  container: MedusaContainer,
  customerId: string
) => {
  const productListIds = await listCustomerProductListIds(container, customerId)

  if (!productListIds.length) {
    return null
  }

  const [favorite] = await getProductListService(container).listProductLists(
    {
      id: { $in: productListIds },
      type: "favorite",
    },
    {
      relations: ["items"],
      take: 1,
    }
  )

  return favorite ?? null
}

export const assertCustomerOwnsProductList = async (
  container: MedusaContainer,
  customerId: string,
  listId: string
) => {
  const listIds = await listCustomerProductListIds(container, customerId)

  if (!listIds.includes(listId)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product list ${listId} was not found`
    )
  }
}

export const findProductListItemForSelection = async (
  container: MedusaContainer,
  listId: string,
  productId: string,
  variantId?: string
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: productLinks } = await query.graph({
    entity: ProductListItemProductLink.entryPoint,
    fields: ["product_list_item_id"],
    filters: {
      product_id: productId,
    },
  })
  let itemIds = (productLinks as ProductListItemProductLinkRecord[]).flatMap(
    (link) => (link.product_list_item_id ? [link.product_list_item_id] : [])
  )

  if (variantId) {
    const { data: variantLinks } = await query.graph({
      entity: ProductListItemVariantLink.entryPoint,
      fields: ["product_list_item_id"],
      filters: {
        product_variant_id: variantId,
      },
    })
    const variantItemIds = new Set(
      (variantLinks as ProductListItemVariantLinkRecord[]).flatMap((link) =>
        link.product_list_item_id ? [link.product_list_item_id] : []
      )
    )

    itemIds = itemIds.filter((itemId) => variantItemIds.has(itemId))
  }

  if (!itemIds.length) {
    return null
  }

  const [item] = await getProductListService(container).listProductListItems(
    {
      id: { $in: itemIds },
      list_id: listId,
    },
    {
      take: 1,
    }
  )

  return item ?? null
}

export const createCustomerProductListLink = async (
  container: MedusaContainer,
  customerId: string,
  listId: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

  await link.create({
    [Modules.CUSTOMER]: {
      customer_id: customerId,
    },
    [PRODUCT_LIST_MODULE]: {
      product_list_id: listId,
    },
  })
}

export const dismissCustomerProductListLink = async (
  container: MedusaContainer,
  customerId: string,
  listId: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

  await link.dismiss({
    [Modules.CUSTOMER]: {
      customer_id: customerId,
    },
    [PRODUCT_LIST_MODULE]: {
      product_list_id: listId,
    },
  })
}

export const createProductListItemProductLinks = async (
  container: MedusaContainer,
  itemId: string,
  productId: string,
  variantId?: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
  const links: Record<string, Record<string, string>>[] = [
    {
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_id: productId,
      },
    },
  ]

  if (variantId) {
    links.push({
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_variant_id: variantId,
      },
    })
  }

  await link.create(links)
}

export const dismissProductListItemProductLinks = async (
  container: MedusaContainer,
  itemId: string,
  productId: string,
  variantId?: string
) => {
  const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
  const links: Record<string, Record<string, string>>[] = [
    {
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_id: productId,
      },
    },
  ]

  if (variantId) {
    links.push({
      [PRODUCT_LIST_MODULE]: {
        product_list_item_id: itemId,
      },
      [Modules.PRODUCT]: {
        product_variant_id: variantId,
      },
    })
  }

  await link.dismiss(links)
}
