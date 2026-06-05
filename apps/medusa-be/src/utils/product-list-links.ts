import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { CustomerProductListLink } from "../links/customer-product-list"
import { isObjectRecord } from "./guards"

export type CustomerProductListLinkRecord = {
  customer_id?: string
  product_list_id?: string
}

export type ProductListItemProductLinkRecord = {
  product_id?: string
  product_list_item_id?: string
}

export type ProductListItemVariantLinkRecord = {
  product_variant_id?: string
  product_list_item_id?: string
}

const CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE = 1000

const isCustomerProductListLinkRecord = (
  value: unknown
): value is CustomerProductListLinkRecord =>
  isObjectRecord(value) &&
  (value.customer_id === undefined || typeof value.customer_id === "string") &&
  (value.product_list_id === undefined ||
    typeof value.product_list_id === "string")

const isProductListItemProductLinkRecord = (
  value: unknown
): value is ProductListItemProductLinkRecord =>
  isObjectRecord(value) &&
  (value.product_id === undefined || typeof value.product_id === "string") &&
  (value.product_list_item_id === undefined ||
    typeof value.product_list_item_id === "string")

const isProductListItemVariantLinkRecord = (
  value: unknown
): value is ProductListItemVariantLinkRecord =>
  isObjectRecord(value) &&
  (value.product_variant_id === undefined ||
    typeof value.product_variant_id === "string") &&
  (value.product_list_item_id === undefined ||
    typeof value.product_list_item_id === "string")

const toCustomerProductListLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isCustomerProductListLinkRecord) : []

export const toProductListItemProductLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemProductLinkRecord) : []

export const toProductListItemVariantLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemVariantLinkRecord) : []

export const listCustomerProductListIds = async (
  container: MedusaContainer,
  customerId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productListIds: string[] = []
  let skip = 0

  while (true) {
    const { data } = await query.graph({
      entity: CustomerProductListLink.entryPoint,
      fields: ["product_list_id"],
      filters: {
        customer_id: customerId,
      },
      pagination: {
        skip,
        take: CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE,
      },
    })

    const links = toCustomerProductListLinks(data)
    productListIds.push(
      ...links.flatMap((link) =>
        link.product_list_id ? [link.product_list_id] : []
      )
    )

    if (links.length < CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE) {
      return productListIds
    }

    skip += CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE
  }
}

export const assertCustomerOwnsProductList = async (
  container: MedusaContainer,
  customerId: string,
  listId: string
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: CustomerProductListLink.entryPoint,
    fields: ["product_list_id"],
    filters: {
      customer_id: customerId,
      product_list_id: listId,
    },
    pagination: {
      take: 1,
    },
  })
  const [link] = toCustomerProductListLinks(data)

  if (!link?.product_list_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product list ${listId} was not found`
    )
  }
}
