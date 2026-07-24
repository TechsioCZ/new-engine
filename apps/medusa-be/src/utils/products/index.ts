import { MedusaError } from "@medusajs/framework/utils"

import type * as Steps from "../../workflows/seed/steps"

function safeJsonParse<T>(
  json: string,
  fieldName: string,
  productHandle: string
): T | null {
  try {
    const parsed = JSON.parse(json)
    return parsed as T
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid JSON in ${fieldName} for product "${productHandle}": ${errorMessage}`
    )
  }
}

/** Raw product data from the database (JSON strings) */
type RawProductFromDb = {
  title: string
  handle: string
  description?: string
  thumbnail?: string
  images: string // JSON string
  variants: string // JSON string
  options: string // JSON string
  categories: string // JSON string
  brand: string // JSON string
}

/** Raw option data after JSON parsing */
type RawOption = {
  title?: string
  option_values?: string[]
}

/** Raw variant data after JSON parsing */
type RawVariant = {
  title?: string
  sku?: string | null
  ean?: string
  material?: string
  collection?: string
  options?: Record<string, string | null>
  prices?: { amount: number; currency_code: string }[]
  images?: { url?: string }[]
  thumbnail?: string
  metadata?: {
    attributes?: { name: string; value?: string }[]
    user_code?: string
  }
  quantities?: {
    quantity?: number
    supplier_quantity?: number
  }
}

/** Raw brand data after JSON parsing */
type RawBrand = {
  title?: string
  attributes?: { name: string; value: string }[]
}

export function toCreateProductsStepInput(
  products: RawProductFromDb[]
): Steps.CreateProductsStepInput {
  return products.map((raw) => {
    const parsedImages = safeJsonParse<{ url?: string }[]>(
      raw.images,
      "images",
      raw.handle
    )
    const parsedVariants = safeJsonParse<RawVariant[]>(
      raw.variants,
      "variants",
      raw.handle
    )
    const parsedOptions = safeJsonParse<RawOption[]>(
      raw.options,
      "options",
      raw.handle
    )
    const parsedCategories = safeJsonParse<{ handle: string }[]>(
      raw.categories,
      "categories",
      raw.handle
    )
    const parsedBrand = safeJsonParse<RawBrand | null>(
      raw.brand,
      "brand",
      raw.handle
    )

    const options = (parsedOptions ?? []).map((o) => ({
      title: o.title ?? "Variant",
      values: o.option_values ?? ["Default"],
    }))

    const variants = (parsedVariants ?? [])
      .filter((v): v is RawVariant & { sku: string } => v.sku != null)
      .map((v) => ({
        title: v.title ?? v.sku,
        sku: v.sku,
        ...(v.ean ? { ean: v.ean } : {}),
        ...(v.material ? { material: v.material } : {}),
        ...(v.options
          ? {
              options: Object.fromEntries(
                Object.entries(v.options).map(([key, value]) => [
                  key,
                  value ?? "Default",
                ])
              ),
            }
          : {}),
        ...(v.prices ? { prices: v.prices } : {}),
        images: (v.images ?? []).filter(
          (im): im is { url: string } => im.url != null
        ),
        ...(v.thumbnail ? { thumbnail: v.thumbnail } : {}),
        ...(v.metadata ? { metadata: v.metadata } : {}),
        ...(v.quantities ? { quantities: v.quantities } : {}),
      }))

    return {
      title: raw.title,
      categories: parsedCategories ?? [],
      description: raw.description ?? "",
      handle: raw.handle,
      weight: 1,
      shippingProfileName: "Default Shipping Profile",
      ...(raw.thumbnail ? { thumbnail: raw.thumbnail } : {}),
      images: (parsedImages ?? []).filter(
        (im): im is { url: string } => im.url != null
      ),
      ...(options.length === 0 ? {} : { options }),
      brand: parsedBrand,
      ...(variants.length === 0 ? {} : { variants }),
      salesChannelNames: ["Default Sales Channel"],
    }
  })
}
