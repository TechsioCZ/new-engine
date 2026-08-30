import { ProductStatus } from "@medusajs/framework/utils"
import type { CreateProductCategoriesStepInput } from "../../workflows/seed/steps/create-product-categories"
import type { CreateProductsStepInput } from "../../workflows/seed/steps/create-products"

export const HERBATICA_SUPPLEMENTAL_MANIFEST_SHA256 =
  "a1c11b667e348565f1683fbac9d5ed2c49dbb45f3ac0929a308271b3759944fa"
export const HERBATICA_SUPPLEMENTAL_PRODUCT_COUNT = 304
export const HERBATICA_SUPPLEMENTAL_CATEGORY_COUNT = 5

export const HERBATICA_MARKET_CONFIG = {
  sk: {
    currencyCode: "eur",
    localeCode: "sk-SK",
    salesChannelName: "Herbatica Storefront SK",
  },
  cz: {
    currencyCode: "czk",
    localeCode: "cs-CZ",
    salesChannelName: "Herbatica Storefront CZ",
  },
  hu: {
    currencyCode: "huf",
    localeCode: "hu-HU",
    salesChannelName: "Herbatica Storefront HU",
  },
  ro: {
    currencyCode: "ron",
    localeCode: "ro-RO",
    salesChannelName: "Herbatica Storefront RO",
  },
} as const

export type HerbaticaMarket = keyof typeof HERBATICA_MARKET_CONFIG

export type HerbaticaSupplementalLocalizedProduct = Readonly<{
  description: string
  public_slug: string
  short_description: string
  source_url: string
  title: string
}>

export type HerbaticaSupplementalProduct = Readonly<{
  brand: null | string
  category_handle: string
  category_path: string
  code: string
  customer_ean: null | string
  ean: null | string
  external_id: string
  images: readonly string[]
  localized: Readonly<
    Partial<Record<HerbaticaMarket, HerbaticaSupplementalLocalizedProduct>>
  >
  prices: Readonly<Partial<Record<"czk" | "eur" | "huf" | "ron", number>>>
  published_markets: readonly HerbaticaMarket[]
  source_guid: null | string
  source_shopitem_id: string
  stock_quantity: number
  vat: number
}>

export type HerbaticaSupplementalManifest = Readonly<{
  captured_at: string
  categories: readonly Readonly<{
    handle: string
    name: string
    parent_handle: null | string
    source_path: string
  }>[]
  products: readonly HerbaticaSupplementalProduct[]
  schema_version: 1
  sha256: string
  source: string
}>

type ParseOptions = Readonly<{
  expectedCategoryCount?: number
  expectedProductCount?: number
  expectedSha256?: string
}>

const MARKETS = Object.keys(HERBATICA_MARKET_CONFIG) as HerbaticaMarket[]
const SUPPLEMENTAL_CATEGORY_HANDLE_REMAP: Readonly<Record<string, string>> = {
  "prirodna-kozmetika-telova-kozmetika-repelenty":
    "prirodna-kozmetika-telova-kozmetika-repelenty-ochrana-pred-hmyzom",
  "prirodna-kozmetika-telova-kozmetika-starostlivost-o-nohy":
    "prirodna-kozmetika-pletova-kozmetika-starostlivost-o-nohy",
  zvierata: "veterinarna-starostlivost",
  "zvierata-macky": "veterinarna-starostlivost-macky",
  "zvierata-psy": "veterinarna-starostlivost-psy",
}
const SLUG = /^[a-z0-9][a-z0-9-]*$/
const SHA256 = /^[a-f0-9]{64}$/
const SOURCE_ID = /^\d+$/
const SOURCE_CODE = /^[A-Za-z0-9._/-]+$/
const EAN = /^\d{8,14}$/

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const string = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

const nullableString = (value: unknown, label: string) =>
  value === null ? null : string(value, label)

const finiteNumber = (value: unknown, label: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
  return value
}

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} fields are invalid`)
  }
}

const parseLocalizedProduct = (
  value: unknown,
  label: string,
  market: HerbaticaMarket
): HerbaticaSupplementalLocalizedProduct => {
  const input = record(value, label)
  exactKeys(
    input,
    ["description", "public_slug", "short_description", "source_url", "title"],
    label
  )
  const publicSlug = string(input.public_slug, `${label}.public_slug`)
  if (!SLUG.test(publicSlug) || publicSlug.length > 200) {
    throw new Error(`${label}.public_slug is invalid`)
  }
  const sourceUrl = string(input.source_url, `${label}.source_url`)
  const expectedPrefix = `https://www.herbatica.${market}/`
  if (!sourceUrl.startsWith(expectedPrefix)) {
    throw new Error(`${label}.source_url is invalid`)
  }
  const sourceSlug = new URL(sourceUrl).pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
  if (sourceSlug !== publicSlug) {
    throw new Error(`${label}.public_slug differs from source_url`)
  }
  return {
    description: string(input.description, `${label}.description`),
    public_slug: publicSlug,
    short_description: string(
      input.short_description,
      `${label}.short_description`
    ),
    source_url: sourceUrl,
    title: string(input.title, `${label}.title`),
  }
}

const parseProduct = (
  value: unknown,
  index: number
): HerbaticaSupplementalProduct => {
  const label = `products[${index}]`
  const input = record(value, label)
  exactKeys(
    input,
    [
      "brand",
      "category_handle",
      "category_path",
      "code",
      "customer_ean",
      "ean",
      "external_id",
      "images",
      "localized",
      "prices",
      "published_markets",
      "source_guid",
      "source_shopitem_id",
      "stock_quantity",
      "vat",
    ],
    label
  )
  const sourceShopitemId = string(
    input.source_shopitem_id,
    `${label}.source_shopitem_id`
  )
  if (!SOURCE_ID.test(sourceShopitemId)) {
    throw new Error(`${label}.source_shopitem_id is invalid`)
  }
  const code = string(input.code, `${label}.code`)
  if (!SOURCE_CODE.test(code)) {
    throw new Error(`${label}.code is invalid`)
  }
  const externalId = string(input.external_id, `${label}.external_id`)
  if (externalId !== `herbatica-sk-shopitem-${sourceShopitemId}`) {
    throw new Error(`${label}.external_id is invalid`)
  }
  const customerEan = nullableString(
    input.customer_ean,
    `${label}.customer_ean`
  )
  if (customerEan && !EAN.test(customerEan)) {
    throw new Error(`${label}.customer_ean is invalid`)
  }
  const ean = nullableString(input.ean, `${label}.ean`)
  if (ean && (!EAN.test(ean) || ean !== customerEan)) {
    throw new Error(`${label}.ean is invalid`)
  }
  if (!Array.isArray(input.images) || input.images.length === 0) {
    throw new Error(`${label}.images must be a non-empty array`)
  }
  const images = input.images.map((image, imageIndex) => {
    const url = string(image, `${label}.images[${imageIndex}]`)
    if (!url.startsWith("https://cdn.myshoptet.com/")) {
      throw new Error(`${label}.images[${imageIndex}] is invalid`)
    }
    return url
  })
  if (!Array.isArray(input.published_markets)) {
    throw new Error(`${label}.published_markets must be an array`)
  }
  const publishedMarkets = input.published_markets.map(
    (market, marketIndex) => {
      if (
        !(
          typeof market === "string" &&
          MARKETS.includes(market as HerbaticaMarket)
        )
      ) {
        throw new Error(`${label}.published_markets[${marketIndex}] is invalid`)
      }
      return market as HerbaticaMarket
    }
  )
  if (
    new Set(publishedMarkets).size !== publishedMarkets.length ||
    !publishedMarkets.includes("sk")
  ) {
    throw new Error(`${label}.published_markets is invalid`)
  }
  const localizedInput = record(input.localized, `${label}.localized`)
  exactKeys(localizedInput, publishedMarkets, `${label}.localized`)
  const pricesInput = record(input.prices, `${label}.prices`)
  exactKeys(
    pricesInput,
    publishedMarkets.map(
      (market) => HERBATICA_MARKET_CONFIG[market].currencyCode
    ),
    `${label}.prices`
  )
  const localized: Partial<
    Record<HerbaticaMarket, HerbaticaSupplementalLocalizedProduct>
  > = {}
  const prices: Partial<Record<"czk" | "eur" | "huf" | "ron", number>> = {}
  for (const market of publishedMarkets) {
    localized[market] = parseLocalizedProduct(
      localizedInput[market],
      `${label}.localized.${market}`,
      market
    )
    const currencyCode = HERBATICA_MARKET_CONFIG[market].currencyCode
    const amount = finiteNumber(
      pricesInput[currencyCode],
      `${label}.prices.${currencyCode}`
    )
    if (amount <= 0) {
      throw new Error(`${label}.prices.${currencyCode} must be positive`)
    }
    prices[currencyCode] = amount
  }
  const stockQuantity = finiteNumber(
    input.stock_quantity,
    `${label}.stock_quantity`
  )
  if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0) {
    throw new Error(`${label}.stock_quantity is invalid`)
  }
  const vat = finiteNumber(input.vat, `${label}.vat`)
  if (!Number.isSafeInteger(vat) || vat < 0 || vat > 100) {
    throw new Error(`${label}.vat is invalid`)
  }
  return {
    brand: nullableString(input.brand, `${label}.brand`),
    category_handle: string(input.category_handle, `${label}.category_handle`),
    category_path: string(input.category_path, `${label}.category_path`),
    code,
    customer_ean: customerEan,
    ean,
    external_id: externalId,
    images,
    localized,
    prices,
    published_markets: publishedMarkets,
    source_guid: nullableString(input.source_guid, `${label}.source_guid`),
    source_shopitem_id: sourceShopitemId,
    stock_quantity: stockQuantity,
    vat,
  }
}

export const parseHerbaticaSupplementalManifest = (
  value: unknown,
  options: ParseOptions = {}
): HerbaticaSupplementalManifest => {
  const input = record(value, "manifest")
  exactKeys(
    input,
    [
      "captured_at",
      "categories",
      "products",
      "schema_version",
      "sha256",
      "source",
    ],
    "manifest"
  )
  if (input.schema_version !== 1) {
    throw new Error("manifest.schema_version must be 1")
  }
  const sha256 = string(input.sha256, "manifest.sha256")
  if (!SHA256.test(sha256)) {
    throw new Error("manifest.sha256 is invalid")
  }
  const expectedSha256 =
    options.expectedSha256 ?? HERBATICA_SUPPLEMENTAL_MANIFEST_SHA256
  if (sha256 !== expectedSha256) {
    throw new Error(
      "manifest.sha256 does not match approved customer extraction"
    )
  }
  if (!Array.isArray(input.categories)) {
    throw new Error("manifest.categories must be an array")
  }
  const categories = input.categories.map((categoryValue, index) => {
    const label = `categories[${index}]`
    const category = record(categoryValue, label)
    exactKeys(
      category,
      ["handle", "name", "parent_handle", "source_path"],
      label
    )
    return {
      handle: string(category.handle, `${label}.handle`),
      name: string(category.name, `${label}.name`),
      parent_handle: nullableString(
        category.parent_handle,
        `${label}.parent_handle`
      ),
      source_path: string(category.source_path, `${label}.source_path`),
    }
  })
  if (!Array.isArray(input.products)) {
    throw new Error("manifest.products must be an array")
  }
  const products = input.products.map(parseProduct)
  const expectedCategoryCount =
    options.expectedCategoryCount ?? HERBATICA_SUPPLEMENTAL_CATEGORY_COUNT
  const expectedProductCount =
    options.expectedProductCount ?? HERBATICA_SUPPLEMENTAL_PRODUCT_COUNT
  if (categories.length !== expectedCategoryCount) {
    throw new Error(
      `manifest must contain ${expectedCategoryCount} supplemental categories`
    )
  }
  if (products.length !== expectedProductCount) {
    throw new Error(
      `manifest must contain ${expectedProductCount} supplemental products`
    )
  }
  const categoryHandles = new Set(categories.map(({ handle }) => handle))
  if (categoryHandles.size !== categories.length) {
    throw new Error("manifest contains duplicate category handles")
  }
  for (const category of categories) {
    if (
      category.parent_handle &&
      categoryHandles.has(category.parent_handle) &&
      categories.findIndex(({ handle }) => handle === category.parent_handle) >=
        categories.findIndex(({ handle }) => handle === category.handle)
    ) {
      throw new Error(`category ${category.handle} appears before its parent`)
    }
  }
  for (const field of ["code", "source_shopitem_id"] as const) {
    const values = products.map((product) => product[field])
    if (new Set(values).size !== values.length) {
      throw new Error(`manifest contains duplicate product ${field}`)
    }
  }
  const customerEanCounts = new Map<string, number>()
  for (const { customer_ean: customerEan } of products) {
    if (customerEan) {
      customerEanCounts.set(
        customerEan,
        (customerEanCounts.get(customerEan) ?? 0) + 1
      )
    }
  }
  for (const product of products) {
    const expectedEan =
      product.customer_ean && customerEanCounts.get(product.customer_ean) === 1
        ? product.customer_ean
        : null
    if (product.ean !== expectedEan) {
      throw new Error(
        `product ${product.code} must omit ambiguous customer EAN from variant identity`
      )
    }
  }
  for (const market of MARKETS) {
    const slugs = products.flatMap((product) => {
      const localized = product.localized[market]
      return localized ? [localized.public_slug] : []
    })
    if (new Set(slugs).size !== slugs.length) {
      throw new Error(`manifest contains duplicate ${market} public slug`)
    }
  }
  return {
    captured_at: string(input.captured_at, "manifest.captured_at"),
    categories,
    products,
    schema_version: 1,
    sha256,
    source: string(input.source, "manifest.source"),
  }
}

export const supplementalCategoryHandle = (handle: string) =>
  SUPPLEMENTAL_CATEGORY_HANDLE_REMAP[handle] ?? handle

export const buildSupplementalCategoryInput = (
  manifest: HerbaticaSupplementalManifest
): CreateProductCategoriesStepInput =>
  manifest.categories
    .filter(({ handle }) => supplementalCategoryHandle(handle) === handle)
    .map((category) => ({
      handle: category.handle,
      isActive: true,
      metadata: {
        source: "herbatica-authorized-live-catalog",
        source_path: category.source_path,
      },
      name: category.name,
      parentHandle: category.parent_handle ?? undefined,
    }))

export const supplementalProductHandle = (
  product: HerbaticaSupplementalProduct
) => `shopitem-${product.source_shopitem_id}`

export const supplementalProductSku = (product: HerbaticaSupplementalProduct) =>
  `SHOPITEM-${product.source_shopitem_id}-${product.source_shopitem_id}`

export const buildSupplementalProductInput = (
  manifest: HerbaticaSupplementalManifest
): CreateProductsStepInput =>
  manifest.products.map((product) => {
    const sk = product.localized.sk
    if (!sk) {
      throw new Error(`product ${product.code} has no SK source content`)
    }
    const images = product.images.map((url) => ({ url }))
    return {
      brand: product.brand ? { title: product.brand } : null,
      categories: [
        { handle: supplementalCategoryHandle(product.category_handle) },
      ],
      description: sk.description,
      external_id: product.source_shopitem_id,
      handle: supplementalProductHandle(product),
      images,
      metadata: {
        category_paths: [product.category_path],
        short_description: sk.short_description,
        source: "herbatica-authorized-live-catalog",
        source_captured_at: manifest.captured_at,
        source_code: product.code,
        source_guid: product.source_guid,
        source_shopitem_id: product.source_shopitem_id,
        source_urls: Object.fromEntries(
          product.published_markets.map((market) => [
            market,
            product.localized[market]?.source_url,
          ])
        ),
        top_offer: {
          code: product.code,
          ean: product.customer_ean,
          vat: product.vat,
        },
      },
      options: [{ title: "Default option", values: ["Default option value"] }],
      salesChannelNames: [
        "Default Sales Channel",
        ...product.published_markets.map(
          (market) => HERBATICA_MARKET_CONFIG[market].salesChannelName
        ),
      ],
      shippingProfileName: "Default Shipping Profile",
      status: ProductStatus.PUBLISHED,
      thumbnail: product.images[0],
      title: sk.title,
      variants: [
        {
          ean: product.ean,
          images,
          metadata: {
            code: product.code,
            source_guid: product.source_guid,
            source_shopitem_id: product.source_shopitem_id,
          },
          options: { "Default option": "Default option value" },
          prices: Object.entries(product.prices).map(
            ([currencyCode, amount]) => ({
              amount,
              currency_code: currencyCode,
            })
          ),
          quantities: {
            locations: [
              {
                quantity: product.stock_quantity,
                stockLocationName: "European Warehouse",
              },
            ],
          },
          sku: supplementalProductSku(product),
          thumbnail: product.images[0],
          title: "Default option value",
        },
      ],
      weight: 1,
    }
  })

export const buildProductPublicationMetadata = (
  product: HerbaticaSupplementalProduct,
  salesChannelIds: Readonly<Record<HerbaticaMarket, string>>
) => ({
  markets: Object.fromEntries(
    product.published_markets.map((market) => {
      const localized = product.localized[market]
      if (!localized) {
        throw new Error(`product ${product.code} has no ${market} content`)
      }
      return [
        market,
        {
          publicationStatus: "published",
          publicSlug: localized.public_slug,
          salesChannelId: salesChannelIds[market],
        },
      ]
    })
  ),
  schemaVersion: 1,
})
