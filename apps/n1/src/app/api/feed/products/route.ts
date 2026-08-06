import { getRecordValue } from "@techsio/std/object"
import { NextResponse } from "next/server"

import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
} from "@/lib/medusa-backend-url"

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

const readUnknown = (source: Record<string, unknown>, key: string): unknown =>
  source[key]

const readString = (
  source: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = readUnknown(source, key)
  return typeof value === "string" ? value : undefined
}

const readNumber = (
  source: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = readUnknown(source, key)
  return typeof value === "number" ? value : undefined
}

const nonEmptyOrDefault = (
  value: string | undefined,
  fallback: string,
): string => (value === undefined || value.length === 0 ? fallback : value)

const readEnvironmentString = (key: string): string | undefined => {
  const value = getRecordValue(process.env, key)
  return typeof value === "string" ? value : undefined
}

const MEDUSA_API_URL = getMedusaBackendUrl()
const MEDUSA_API_KEY = getMedusaPublishableKey()
const BATCH_SIZE = 100
const SITE_URL = nonEmptyOrDefault(
  readEnvironmentString("NEXT_PUBLIC_SITE_URL"),
  "https://example.com",
)
const DEFAULT_REGION_ID = nonEmptyOrDefault(
  readEnvironmentString("NEXT_PUBLIC_DEFAULT_REGION_ID"),
  "reg_01JYERR9Q887DKZ9JAR7SMJHA5",
)
const DEFAULT_CURRENCY_CODE = "CZK"
const INVALID_PAYLOAD_MESSAGE =
  "Medusa API returned an unexpected product payload"
const FEED_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "Content-Type": "application/xml; charset=utf-8",
}

interface MedusaAttribute {
  name: string
  value: string
}

interface MedusaCalculatedPrice {
  calculated_amount: number | undefined
  currency_code: string | undefined
}

interface MedusaVariant {
  id: string
  title: string | undefined
  sku: string | undefined
  ean: string | undefined
  calculated_price: MedusaCalculatedPrice | undefined
  attributes: MedusaAttribute[]
}

interface MedusaProduct {
  id: string
  title: string
  handle: string
  description: string | undefined
  thumbnail: string | undefined
  variants: MedusaVariant[]
  categoryNames: string[]
}

interface MedusaProductPage {
  products: MedusaProduct[]
  count: number
}

const parseAttribute = (value: unknown): MedusaAttribute | undefined => {
  if (!isNonNullObject(value)) {
    return undefined
  }

  const name = readString(value, "name")
  const attributeValue = readString(value, "value")

  return name === undefined || attributeValue === undefined
    ? undefined
    : { name, value: attributeValue }
}

const parseAttributes = (value: unknown): MedusaAttribute[] =>
  isUnknownArray(value)
    ? value
        .map((entry) => parseAttribute(entry))
        .filter((attribute) => attribute !== undefined)
    : []

const parseCalculatedPrice = (
  value: unknown,
): MedusaCalculatedPrice | undefined =>
  isNonNullObject(value)
    ? {
        calculated_amount: readNumber(value, "calculated_amount"),
        currency_code: readString(value, "currency_code"),
      }
    : undefined

const parseVariant = (value: unknown): MedusaVariant => {
  if (!isNonNullObject(value)) {
    throw new Error(INVALID_PAYLOAD_MESSAGE)
  }

  const id = readString(value, "id")

  if (id === undefined) {
    throw new Error(INVALID_PAYLOAD_MESSAGE)
  }

  const metadata = readUnknown(value, "metadata")

  return {
    attributes: parseAttributes(
      isNonNullObject(metadata)
        ? readUnknown(metadata, "attributes")
        : undefined,
    ),
    calculated_price: parseCalculatedPrice(
      readUnknown(value, "calculated_price"),
    ),
    ean: readString(value, "ean"),
    id,
    sku: readString(value, "sku"),
    title: readString(value, "title"),
  }
}

// A category without a usable name joins as an empty segment, matching the
// upstream feed contract.
const parseCategoryNames = (value: unknown): string[] =>
  isUnknownArray(value)
    ? value.map((entry) =>
        isNonNullObject(entry) ? (readString(entry, "name") ?? "") : "",
      )
    : []

const parseProduct = (value: unknown): MedusaProduct => {
  if (!isNonNullObject(value)) {
    throw new Error(INVALID_PAYLOAD_MESSAGE)
  }

  const id = readString(value, "id")
  const title = readString(value, "title")
  const handle = readString(value, "handle")

  if (id === undefined || title === undefined || handle === undefined) {
    throw new Error(INVALID_PAYLOAD_MESSAGE)
  }

  const variants = readUnknown(value, "variants")

  return {
    categoryNames: parseCategoryNames(readUnknown(value, "categories")),
    description: readString(value, "description"),
    handle,
    id,
    thumbnail: readString(value, "thumbnail"),
    title,
    variants: isUnknownArray(variants)
      ? variants.map((variant) => parseVariant(variant))
      : [],
  }
}

const parseProductPage = (value: unknown): MedusaProductPage => {
  if (!isNonNullObject(value)) {
    throw new Error(INVALID_PAYLOAD_MESSAGE)
  }

  const products = readUnknown(value, "products")
  const count = readNumber(value, "count")

  if (!isUnknownArray(products) || count === undefined) {
    throw new Error(INVALID_PAYLOAD_MESSAGE)
  }

  return { count, products: products.map((product) => parseProduct(product)) }
}

const fetchProductPage = async (offset: number): Promise<MedusaProductPage> => {
  const url = `${MEDUSA_API_URL}/store/products?limit=${BATCH_SIZE}&offset=${offset}&region_id=${DEFAULT_REGION_ID}&fields=*variants.calculated_price`

  const response = await fetch(url, {
    headers: { "x-publishable-api-key": MEDUSA_API_KEY },
    // Cache for 1 hour
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Medusa API error: ${response.status}`)
  }

  const payload: unknown = await response.json()

  return parseProductPage(payload)
}

// Pages are walked sequentially through recursion because every page reports
// the total the next offset is compared against.
const collectProducts = async (
  offset: number,
  collected: MedusaProduct[],
): Promise<MedusaProduct[]> => {
  const page = await fetchProductPage(offset)

  collected.push(...page.products)

  const nextOffset = offset + BATCH_SIZE

  return nextOffset < page.count
    ? await collectProducts(nextOffset, collected)
    : collected
}

const fetchAllProducts = async (): Promise<MedusaProduct[]> =>
  await collectProducts(0, [])

const escapeXml = (str: string): string =>
  str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const formatPrice = (amount: number | undefined): string =>
  amount === undefined || amount === 0 || Number.isNaN(amount)
    ? "0"
    : (amount / 100).toFixed(2)

const buildShopItem = (
  product: MedusaProduct,
  variant: MedusaVariant,
): string => {
  const variantTitle = nonEmptyOrDefault(variant.title, "Default")
  const url = `${SITE_URL}/produkt/${product.handle}?variant=${encodeURIComponent(variantTitle)}`

  const manufacturer =
    variant.attributes.find((attribute) => attribute.name === "Distributor")
      ?.value ?? ""

  const category = product.categoryNames.join(" > ")

  const price = formatPrice(variant.calculated_price?.calculated_amount)
  const currency = nonEmptyOrDefault(
    variant.calculated_price?.currency_code?.toUpperCase(),
    DEFAULT_CURRENCY_CODE,
  )

  return `
    <SHOPITEM>
      <ITEM_ID>${escapeXml(variant.id)}</ITEM_ID>
      <PRODUCTNAME>${escapeXml(`${product.title} - ${variantTitle}`)}</PRODUCTNAME>
      <PRODUCT>${escapeXml(product.title)}</PRODUCT>
      <DESCRIPTION>${escapeXml(product.description ?? "")}</DESCRIPTION>
      <URL>${escapeXml(url)}</URL>
      <IMGURL>${escapeXml(product.thumbnail ?? "")}</IMGURL>
      <PRICE_VAT>${price}</PRICE_VAT>
      <CURRENCY>${currency}</CURRENCY>
      <MANUFACTURER>${escapeXml(manufacturer)}</MANUFACTURER>
      <CATEGORYTEXT>${escapeXml(category)}</CATEGORYTEXT>
      <EAN>${escapeXml(variant.ean ?? "")}</EAN>
      <ITEM_GROUP_ID>${escapeXml(product.id)}</ITEM_GROUP_ID>
      <SKU>${escapeXml(variant.sku ?? "")}</SKU>
      <DELIVERY_DATE>0</DELIVERY_DATE>
      <AVAILABILITY>in stock</AVAILABILITY>
    </SHOPITEM>`
}

const generateXmlFeed = (products: MedusaProduct[]): string => {
  const items = products.flatMap((product) =>
    product.variants.map((variant) => buildShopItem(product, variant)),
  )

  return `<?xml version="1.0" encoding="utf-8"?>
<SHOP>
  ${items.join("\n")}
</SHOP>`
}

const buildFeedResponse = (xml: string): NextResponse =>
  new NextResponse(xml, { headers: FEED_HEADERS })

const getProductFeed = async (): Promise<NextResponse> => {
  if (MEDUSA_API_KEY.length === 0) {
    console.warn("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set.")

    return buildFeedResponse(generateXmlFeed([]))
  }

  try {
    const products = await fetchAllProducts()

    return buildFeedResponse(generateXmlFeed(products))
  } catch (error) {
    console.error("Feed generation error:", error)

    return buildFeedResponse(generateXmlFeed([]))
  }
}

export { getProductFeed as GET }
