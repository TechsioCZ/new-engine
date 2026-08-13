import type { HttpTypes } from "@medusajs/types"
import type { BlogProductReference } from "./blog-content"

const EXTERNAL_KEY_PREFIX = "external:"
const HANDLE_KEY_PREFIX = "handle:"
const SHOPITEM_HANDLE_PREFIX = "shopitem-"

export type BlogProductLookup = Map<string, HttpTypes.StoreProduct>

export const blogProductExternalKey = (externalId: string) =>
  `${EXTERNAL_KEY_PREFIX}${externalId}`

export const blogProductHandleKey = (handle: string) =>
  `${HANDLE_KEY_PREFIX}${handle}`

export const blogProductShopitemHandle = (externalId: string) =>
  `${SHOPITEM_HANDLE_PREFIX}${externalId}`

const addLookupKey = (
  lookup: BlogProductLookup,
  key: string | undefined,
  product: HttpTypes.StoreProduct
) => {
  if (key) {
    lookup.set(key, product)
  }
}

export const indexBlogProducts = (
  lookup: BlogProductLookup,
  products: HttpTypes.StoreProduct[]
) => {
  for (const product of products) {
    const externalId = product.external_id?.trim()
    const handle = product.handle?.trim()

    addLookupKey(
      lookup,
      externalId ? blogProductExternalKey(externalId) : undefined,
      product
    )
    addLookupKey(
      lookup,
      handle ? blogProductHandleKey(handle) : undefined,
      product
    )

    if (handle?.startsWith(SHOPITEM_HANDLE_PREFIX)) {
      addLookupKey(
        lookup,
        blogProductExternalKey(handle.slice(SHOPITEM_HANDLE_PREFIX.length)),
        product
      )
    }
  }
}

export const resolveBlogProductReference = (
  reference: BlogProductReference,
  lookup: BlogProductLookup
) => {
  const externalId = reference.productExternalId?.trim()
  const handle = reference.productSlug?.trim()
  const keys = [
    externalId ? blogProductExternalKey(externalId) : undefined,
    handle ? blogProductHandleKey(handle) : undefined,
    externalId
      ? blogProductHandleKey(blogProductShopitemHandle(externalId))
      : undefined,
  ]

  for (const key of keys) {
    const product = key ? lookup.get(key) : undefined
    if (product) {
      return product
    }
  }
}
