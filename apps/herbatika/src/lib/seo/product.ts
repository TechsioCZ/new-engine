import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import {
  asStorefrontRecord,
  asStorefrontString,
  resolveProductTopOffer,
  resolveStorefrontPrice,
} from "@/lib/storefront/product-pricing"
import type { ProductRouteMedusaProduct } from "@/lib/storefront/product-route-source"

const META_DESCRIPTION_MAX_CODE_POINTS = 160
const EAN_PATTERN = /^\d+$/

type ProductOfferJsonLd = Readonly<{
  "@type": "Offer"
  availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock"
  price: string
  priceCurrency: string
  url: string
}>

export type ProductJsonLd = Readonly<{
  "@context": "https://schema.org"
  "@id": string
  "@type": "Product"
  brand?: Readonly<{ "@type": "Brand"; name: string }>
  description?: string
  gtin8?: string
  gtin12?: string
  gtin13?: string
  gtin14?: string
  image?: readonly string[]
  inLanguage: HerbatikaLocale
  name: string
  offers?: ProductOfferJsonLd
  sku?: string
  url: string
}>

export type ProductSeo = Readonly<{
  canonicalUrl: string
  description: string | null
  images: readonly string[]
  jsonLd: ProductJsonLd
  title: string
}>

type BuildProductSeoInput = Readonly<{
  canonicalUrl: string
  initialVariantId?: string
  locale: HerbatikaLocale
  product: ProductRouteMedusaProduct
}>

const assertCanonicalUrl = (value: string) => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new TypeError("Product SEO URL must be an absolute clean HTTPS URL")
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.href !== value
  ) {
    throw new TypeError("Product SEO URL must be an absolute clean HTTPS URL")
  }
}

const truncateDescription = (value: string) =>
  Array.from(value).slice(0, META_DESCRIPTION_MAX_CODE_POINTS).join("")

const resolveDescription = (product: ProductRouteMedusaProduct) => {
  const metadata = asStorefrontRecord(product.metadata)
  const shortDescription = asStorefrontString(metadata?.short_description)
  const text = stripHtml(shortDescription) || stripHtml(product.description)
  return text ? truncateDescription(text) : null
}

const resolveSafeImageUrl = (value: unknown): string | null => {
  const candidate = asStorefrontString(value)
  if (!candidate) {
    return null
  }
  try {
    const url = new URL(candidate)
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null
  } catch {
    return null
  }
}

const resolveImages = (product: ProductRouteMedusaProduct) => {
  const productImages = Array.isArray(product.images) ? product.images : []
  const candidates = [
    product.thumbnail,
    ...productImages.map((image) => asStorefrontRecord(image)?.url),
  ]
  return [
    ...new Set(candidates.flatMap((value) => resolveSafeImageUrl(value) ?? [])),
  ]
}

const resolveBrandName = (product: ProductRouteMedusaProduct) => {
  const brand = asStorefrontRecord(
    (product as ProductRouteMedusaProduct & { brand?: unknown }).brand
  )
  return asStorefrontString(brand?.title)
}

const resolveSelectedVariant = (
  product: ProductRouteMedusaProduct,
  initialVariantId: string | undefined
) =>
  product.variants.find((variant) => variant.id === initialVariantId) ??
  product.variants[0]

const resolveGtin = (value: unknown) => {
  const ean = asStorefrontString(value)
  if (!(ean && EAN_PATTERN.test(ean) && [8, 12, 13, 14].includes(ean.length))) {
    return {}
  }

  const digits = [...ean].map(Number)
  const checkDigit = digits.pop()
  const weightedSum = digits
    .toReversed()
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0)
  if (checkDigit !== (10 - (weightedSum % 10)) % 10) {
    return {}
  }

  const property = `gtin${ean.length}`
  return { [property]: ean }
}

const resolveOffer = (
  canonicalUrl: string,
  product: ProductRouteMedusaProduct,
  variant: ProductRouteMedusaProduct["variants"][number] | undefined
): ProductOfferJsonLd | null => {
  if (!variant) {
    return null
  }
  const calculatedPrice = variant.calculated_price
  const price = resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.calculated_amount,
    calculatedCurrencyCode: calculatedPrice?.currency_code,
    calculatedOriginalAmount: calculatedPrice?.original_amount,
    topOffer: resolveProductTopOffer(product),
  })
  if (!price) {
    return null
  }
  const inventory = resolveVariantInventoryState(variant)
  return {
    "@type": "Offer",
    availability: inventory.isInStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    price: String(price.currentAmount),
    priceCurrency: price.currencyCode.toUpperCase(),
    url: canonicalUrl,
  }
}

export const buildProductSeo = ({
  canonicalUrl,
  initialVariantId,
  locale,
  product,
}: BuildProductSeoInput): ProductSeo => {
  assertCanonicalUrl(canonicalUrl)
  const title = product.title.trim()
  const description = resolveDescription(product)
  const images = resolveImages(product)
  const brandName = resolveBrandName(product)
  const selectedVariant = resolveSelectedVariant(product, initialVariantId)
  const sku = asStorefrontString(selectedVariant?.sku)
  const offer = resolveOffer(canonicalUrl, product, selectedVariant)

  const jsonLd: ProductJsonLd = {
    "@context": "https://schema.org",
    "@id": canonicalUrl,
    "@type": "Product",
    ...(brandName
      ? { brand: { "@type": "Brand" as const, name: brandName } }
      : {}),
    ...(description ? { description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    inLanguage: locale,
    name: title,
    ...(offer ? { offers: offer } : {}),
    ...(sku ? { sku } : {}),
    ...resolveGtin(selectedVariant?.ean),
    url: canonicalUrl,
  }

  return { canonicalUrl, description, images, jsonLd, title }
}

export const serializeProductJsonLd = (value: ProductJsonLd): string =>
  JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029")
