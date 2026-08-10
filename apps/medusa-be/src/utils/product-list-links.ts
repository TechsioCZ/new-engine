import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { isRecord } from "@techsio/std/object"

import { CustomerProductListLink } from "../links/customer-product-list"

export interface CustomerProductListLinkRecord {
  customer_id?: string | undefined
  product_list_id?: string | undefined
}

export interface ProductListItemProductLinkRecord {
  product_id?: string | undefined
  product_list_item_id?: string | undefined
}

export interface ProductListItemVariantLinkRecord {
  product_variant_id?: string | undefined
  product_list_item_id?: string | undefined
}

const CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE = 1000

const customerProductListLinkSchema = z.object({
  customer_id: z.string().optional(),
  product_list_id: z.string().optional(),
})
const productListItemProductLinkSchema = z.object({
  product_id: z.string().optional(),
  product_list_item_id: z.string().optional(),
})
const productListItemVariantLinkSchema = z.object({
  product_list_item_id: z.string().optional(),
  product_variant_id: z.string().optional(),
})

const isCustomerProductListLinkRecord = (
  value: unknown,
): value is CustomerProductListLinkRecord =>
  customerProductListLinkSchema.safeParse(value).success && isRecord(value)

const isProductListItemProductLinkRecord = (
  value: unknown,
): value is ProductListItemProductLinkRecord =>
  productListItemProductLinkSchema.safeParse(value).success && isRecord(value)

const isProductListItemVariantLinkRecord = (
  value: unknown,
): value is ProductListItemVariantLinkRecord =>
  productListItemVariantLinkSchema.safeParse(value).success && isRecord(value)

const toCustomerProductListLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isCustomerProductListLinkRecord) : []

export const toProductListItemProductLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemProductLinkRecord) : []

export const toProductListItemVariantLinks = (value: unknown) =>
  Array.isArray(value) ? value.filter(isProductListItemVariantLinkRecord) : []

const MAX_CUSTOMER_PRODUCT_LIST_LINK_CHUNKS = 100

const listCustomerProductListIdChunk = async (
  query: Query,
  customerId: string,
  skip: number,
  remainingChunks: number,
): Promise<string[]> => {
  if (remainingChunks === 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Customer ${customerId} has too many product-list links`,
    )
  }

  const { data } = await query.graph({
    entity: CustomerProductListLink.entryPoint,
    fields: ["product_list_id"],
    filters: { customer_id: customerId },
    pagination: {
      skip,
      take: CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE,
    },
  })
  const links = toCustomerProductListLinks(data)
  const productListIds = links.flatMap((link) =>
    typeof link.product_list_id === "string" && link.product_list_id.length > 0
      ? [link.product_list_id]
      : [],
  )
  if (links.length < CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE) {
    return productListIds
  }

  const remainingIds = await listCustomerProductListIdChunk(
    query,
    customerId,
    skip + CUSTOMER_PRODUCT_LIST_LINK_LOOKUP_CHUNK_SIZE,
    remainingChunks - 1,
  )
  return [...productListIds, ...remainingIds]
}

export const listCustomerProductListIds = async (
  container: MedusaContainer,
  customerId: string,
) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  return await listCustomerProductListIdChunk(
    query,
    customerId,
    0,
    MAX_CUSTOMER_PRODUCT_LIST_LINK_CHUNKS,
  )
}

export const assertCustomerOwnsProductList = async (
  container: MedusaContainer,
  customerId: string,
  listId: string,
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

  if (
    typeof link?.product_list_id !== "string" ||
    link.product_list_id.length === 0
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product list ${listId} was not found`,
    )
  }
}
