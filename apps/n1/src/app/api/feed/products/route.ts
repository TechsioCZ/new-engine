import type { HttpTypes } from "@medusajs/types"
import { NextResponse } from "next/server"
import { getStorefrontRegionSelection } from "@/lib/storefront-region"
import { storefrontServerRead } from "@/lib/storefront-server-read"

const BATCH_SIZE = 100

type FeedConfig = {
  siteUrl: string
  defaultRegionId: string
}

type FeedVariant = HttpTypes.StoreProductVariant
type FeedProduct = HttpTypes.StoreProduct
type FeedAttribute = {
  name?: string | null
  value?: string | null
}

async function resolveDefaultRegionId(): Promise<string | null> {
  const explicitRegionId = process.env.NEXT_PUBLIC_DEFAULT_REGION_ID?.trim()

  if (explicitRegionId) {
    return explicitRegionId
  }

  try {
    const { regionId } = await getStorefrontRegionSelection()

    if (!regionId) {
      console.warn("[ProductFeed] Unable to resolve fallback region")
      return null
    }

    return regionId
  } catch (error) {
    console.warn("[ProductFeed] Failed to resolve fallback region", error)
    return null
  }
}

async function resolveFeedConfig(request: Request): Promise<FeedConfig | null> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin
  const defaultRegionId = await resolveDefaultRegionId()

  if (!(siteUrl && defaultRegionId)) {
    console.warn("[ProductFeed] Unable to resolve site URL or default region")
    return null
  }

  return {
    siteUrl,
    defaultRegionId,
  }
}

async function fetchAllProducts(
  defaultRegionId: string
): Promise<FeedProduct[]> {
  const allProducts: FeedProduct[] = []
  let offset = 0
  let total = 0

  do {
    const response = await storefrontServerRead.services.products.getProducts({
      limit: BATCH_SIZE,
      offset,
      region_id: defaultRegionId,
      fields: "*variants.calculated_price",
    })

    const products = response.products
    if (!products.length) {
      break
    }

    total = response.count
    allProducts.push(...products)
    offset += BATCH_SIZE
  } while (offset < total)

  return allProducts
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function buildShopItem(
  product: FeedProduct,
  variant: FeedVariant,
  siteUrl: string
): string {
  const variantTitle = variant.title || "Default"
  const url = `${siteUrl}/produkt/${product.handle}?variant=${encodeURIComponent(variantTitle)}`

  const attributes: FeedAttribute[] = Array.isArray(variant.metadata?.attributes)
    ? (variant.metadata.attributes as FeedAttribute[])
    : []
  const manufacturer =
    attributes.find((a) => a.name === "Distributor")?.value || ""

  const category = product.categories?.map((c) => c.name).join(" > ") || ""

  const price = variant.calculated_price?.calculated_amount
    ? (variant.calculated_price.calculated_amount / 100).toFixed(2)
    : "0"
  const currency =
    variant.calculated_price?.currency_code?.toUpperCase() || "CZK"

  return `
    <SHOPITEM>
      <ITEM_ID>${escapeXml(variant.id)}</ITEM_ID>
      <PRODUCTNAME>${escapeXml(`${product.title} - ${variantTitle}`)}</PRODUCTNAME>
      <PRODUCT>${escapeXml(product.title)}</PRODUCT>
      <DESCRIPTION>${escapeXml(product.description || "")}</DESCRIPTION>
      <URL>${escapeXml(url)}</URL>
      <IMGURL>${escapeXml(product.thumbnail || "")}</IMGURL>
      <PRICE_VAT>${price}</PRICE_VAT>
      <CURRENCY>${currency}</CURRENCY>
      <MANUFACTURER>${escapeXml(manufacturer)}</MANUFACTURER>
      <CATEGORYTEXT>${escapeXml(category)}</CATEGORYTEXT>
      <EAN>${escapeXml(variant.ean || "")}</EAN>
      <ITEM_GROUP_ID>${escapeXml(product.id)}</ITEM_GROUP_ID>
      <SKU>${escapeXml(variant.sku || "")}</SKU>
      <DELIVERY_DATE>0</DELIVERY_DATE>
      <AVAILABILITY>in stock</AVAILABILITY>
    </SHOPITEM>`
}

function generateXmlFeed(products: FeedProduct[], siteUrl: string): string {
  const items: string[] = []

  for (const product of products) {
    for (const variant of product.variants || []) {
      items.push(buildShopItem(product, variant, siteUrl))
    }
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<SHOP>
  ${items.join("\n")}
</SHOP>`
}

export async function GET(request: Request) {
  const config = await resolveFeedConfig(request)

  if (!config) {
    return new NextResponse("Product feed is not configured", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }

  try {
    const products = await fetchAllProducts(config.defaultRegionId)
    const xml = generateXmlFeed(products, config.siteUrl)

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch (error) {
    console.error("Feed generation error:", error)
    const xml = generateXmlFeed([], config.siteUrl)
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  }
}
