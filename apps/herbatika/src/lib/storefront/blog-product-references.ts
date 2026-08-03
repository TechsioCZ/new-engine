import type { HttpTypes } from "@medusajs/types"
import type { BlogProductReference } from "./blog-content"

const EXTERNAL_KEY_PREFIX = "external:"
const HANDLE_KEY_PREFIX = "handle:"
const SHOPITEM_HANDLE_PREFIX = "shopitem-"

export type BlogProductLookup = Map<string, HttpTypes.StoreProduct>

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
      externalId ? `${EXTERNAL_KEY_PREFIX}${externalId}` : undefined,
      product
    )
    addLookupKey(
      lookup,
      handle ? `${HANDLE_KEY_PREFIX}${handle}` : undefined,
      product
    )

    if (handle?.startsWith(SHOPITEM_HANDLE_PREFIX)) {
      addLookupKey(
        lookup,
        `${EXTERNAL_KEY_PREFIX}${handle.slice(SHOPITEM_HANDLE_PREFIX.length)}`,
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
    externalId ? `${EXTERNAL_KEY_PREFIX}${externalId}` : undefined,
    handle ? `${HANDLE_KEY_PREFIX}${handle}` : undefined,
    externalId
      ? `${HANDLE_KEY_PREFIX}${SHOPITEM_HANDLE_PREFIX}${externalId}`
      : undefined,
  ]

  for (const key of keys) {
    const product = key ? lookup.get(key) : undefined
    if (product) {
      return product
    }
  }
}
