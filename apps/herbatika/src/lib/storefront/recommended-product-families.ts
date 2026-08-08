import type { HttpTypes } from "@medusajs/types"
import { getRecordValue } from "@techsio/std/object"

import {
  asStorefrontNumber,
  asStorefrontRecord,
  resolveProductTopOffer,
} from "./product-pricing"
import { asPositiveInteger, asString } from "./recommended-product-values"

interface RecommendedProductCandidate {
  familyKey: string
  firstSeenIndex: number
  packageMultiplier: number
  isInStock: boolean
  product: HttpTypes.StoreProduct
}

const TOP_OFFER_SET_MULTIPLIER_PATTERN = /\/\d+$/u

const resolveProductMetadata = (product: HttpTypes.StoreProduct) =>
  asStorefrontRecord(product.metadata)

const resolveTopOffer = (product: HttpTypes.StoreProduct) =>
  resolveProductTopOffer(product)

const resolvePrimarySetItem = (product: HttpTypes.StoreProduct) => {
  const metadata = resolveProductMetadata(product)
  const setItemsValue =
    metadata === null ? undefined : getRecordValue(metadata, "set_items")
  const setItems = Array.isArray(setItemsValue) ? setItemsValue : []

  for (const item of setItems) {
    const record = asStorefrontRecord(item)
    if (record) {
      const code = asString(getRecordValue(record, "code"))
      const amount = asPositiveInteger(getRecordValue(record, "amount"))
      if (code !== null) {
        return { amount, code }
      }
    }
  }

  return null
}

const normalizeFamilyCode = (code: string | null) => {
  if (code === null) {
    return null
  }

  return code.split("/")[0]?.trim() || null
}

const resolveTopOfferCode = (product: HttpTypes.StoreProduct) => {
  const topOffer = resolveTopOffer(product)
  return asString(getRecordValue(topOffer ?? {}, "code"))
}

export const resolveRecommendedProductFamilyKey = (
  product: HttpTypes.StoreProduct,
) => {
  const primarySetItem = resolvePrimarySetItem(product)
  if (primarySetItem !== null && primarySetItem.code !== null) {
    return primarySetItem.code
  }

  const topOfferCode = normalizeFamilyCode(resolveTopOfferCode(product))
  if (topOfferCode !== null) {
    return topOfferCode
  }

  const metadata = resolveProductMetadata(product)
  const sourceShopitemId = asString(
    getRecordValue(metadata ?? {}, "source_shopitem_id"),
  )
  if (sourceShopitemId !== null) {
    return sourceShopitemId
  }

  return product.id ?? product.handle ?? product.title ?? "unknown-product"
}

const resolveRecommendedProductPackageMultiplier = (
  product: HttpTypes.StoreProduct,
) => {
  const primarySetItem = resolvePrimarySetItem(product)
  if (primarySetItem !== null && primarySetItem.amount !== null) {
    return primarySetItem.amount
  }

  const topOfferCode = resolveTopOfferCode(product)
  if (topOfferCode !== null) {
    const setMultiplier =
      TOP_OFFER_SET_MULTIPLIER_PATTERN.exec(topOfferCode)?.[0].slice(1)
    const parsedMultiplier = asPositiveInteger(setMultiplier)
    if (parsedMultiplier !== null) {
      return parsedMultiplier
    }
  }

  return 1
}

const resolveRecommendedProductInStock = (product: HttpTypes.StoreProduct) => {
  const topOffer = resolveTopOffer(product)
  const stock = asStorefrontRecord(getRecordValue(topOffer ?? {}, "stock"))
  const amount = asStorefrontNumber(getRecordValue(stock ?? {}, "amount"))

  return amount === null ? true : amount > 0
}

const isBetterRecommendedProductCandidate = (
  nextCandidate: RecommendedProductCandidate,
  currentCandidate: RecommendedProductCandidate,
) => {
  if (nextCandidate.isInStock !== currentCandidate.isInStock) {
    return nextCandidate.isInStock
  }

  if (nextCandidate.packageMultiplier !== currentCandidate.packageMultiplier) {
    return nextCandidate.packageMultiplier < currentCandidate.packageMultiplier
  }

  return nextCandidate.firstSeenIndex < currentCandidate.firstSeenIndex
}

export const selectRecommendedProductRepresentatives = (
  products: HttpTypes.StoreProduct[],
  limit: number,
) => {
  const resolvedLimit = Math.max(limit, 0)
  if (resolvedLimit === 0 || products.length === 0) {
    return []
  }

  const seenProducts = new Set<string>()
  const familyCandidates = new Map<string, RecommendedProductCandidate>()

  for (const [index, product] of products.entries()) {
    const productKey =
      product.id ?? product.handle ?? `${product.title ?? "product"}-${index}`
    if (!seenProducts.has(productKey)) {
      seenProducts.add(productKey)

      const familyKey = resolveRecommendedProductFamilyKey(product)
      const currentCandidate = familyCandidates.get(familyKey)
      const nextCandidate: RecommendedProductCandidate = {
        familyKey,
        firstSeenIndex: currentCandidate?.firstSeenIndex ?? index,
        isInStock: resolveRecommendedProductInStock(product),
        packageMultiplier: resolveRecommendedProductPackageMultiplier(product),
        product,
      }

      if (
        !currentCandidate ||
        isBetterRecommendedProductCandidate(nextCandidate, currentCandidate)
      ) {
        familyCandidates.set(familyKey, nextCandidate)
      }
    }
  }

  return [...familyCandidates.values()]
    .toSorted((left, right) => left.firstSeenIndex - right.firstSeenIndex)
    .slice(0, resolvedLimit)
    .map((candidate) => candidate.product)
}
