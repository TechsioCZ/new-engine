import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import type { CreateProductsStepInput } from "../../workflows/seed/steps/create-products"

const parseJson = <T>(
  json: string,
  schema: z.ZodType<T>,
  fieldName: string,
  productHandle: string,
): T => {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid JSON in ${fieldName} for product "${productHandle}": ${errorMessage}`,
    )
  }
  const result = schema.safeParse(parsed)
  if (result.success) {
    return result.data
  }
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Invalid JSON in ${fieldName} for product "${productHandle}": ${result.error.message}`,
  )
}

/** Raw product data from the database (JSON strings) */
interface RawProductFromDb {
  title: string
  handle: string
  description?: string
  thumbnail?: string
  images: string
  variants: string
  options: string
  categories: string
  brand: string
}

const rawImageSchema = z.object({ url: z.string().optional() })
const rawOptionSchema = z.object({
  option_values: z.array(z.string()).optional(),
  title: z.string().optional(),
})
const rawVariantSchema = z.object({
  collection: z.string().optional(),
  ean: z.string().optional(),
  images: z.array(rawImageSchema).optional(),
  material: z.string().optional(),
  metadata: z
    .object({
      attributes: z
        .array(z.object({ name: z.string(), value: z.string().optional() }))
        .optional(),
      user_code: z.string().optional(),
    })
    .optional(),
  options: z.record(z.string(), z.string().nullable()).optional(),
  prices: z
    .array(z.object({ amount: z.number(), currency_code: z.string() }))
    .optional(),
  quantities: z
    .object({
      quantity: z.number().optional(),
      supplier_quantity: z.number().optional(),
    })
    .optional(),
  sku: z.string().nullable().optional(),
  thumbnail: z.string().optional(),
  title: z.string().optional(),
})
type RawVariant = z.infer<typeof rawVariantSchema>

const rawBrandSchema = z
  .object({
    attributes: z
      .array(z.object({ name: z.string(), value: z.string() }))
      .optional(),
    title: z.string().optional(),
  })
  .nullable()
const rawCategorySchema = z.object({ handle: z.string() })

export const toCreateProductsStepInput = (
  products: RawProductFromDb[],
): CreateProductsStepInput =>
  products.map((raw) => {
    const parsedImages = parseJson(
      raw.images,
      z.array(rawImageSchema),
      "images",
      raw.handle,
    )
    const parsedVariants = parseJson(
      raw.variants,
      z.array(rawVariantSchema),
      "variants",
      raw.handle,
    )
    const parsedOptions = parseJson(
      raw.options,
      z.array(rawOptionSchema),
      "options",
      raw.handle,
    )
    const parsedCategories = parseJson(
      raw.categories,
      z.array(rawCategorySchema),
      "categories",
      raw.handle,
    )
    const parsedBrand = parseJson(
      raw.brand,
      rawBrandSchema,
      "brand",
      raw.handle,
    )

    const options = (parsedOptions ?? []).map((o) => ({
      title: o.title ?? "Variant",
      values: o.option_values ?? ["Default"],
    }))

    const variants = (parsedVariants ?? [])
      .filter(
        (v): v is RawVariant & { sku: string } =>
          v.sku !== null && v.sku !== undefined,
      )
      .map((v) => ({
        ...(typeof v.ean === "string" ? { ean: v.ean } : {}),
        images: (v.images ?? []).filter(
          (im): im is { url: string } =>
            im.url !== null && im.url !== undefined,
        ),
        ...(typeof v.material === "string" ? { material: v.material } : {}),
        ...(v.metadata ? { metadata: v.metadata } : {}),
        ...(v.options
          ? {
              options: Object.fromEntries(
                Object.entries(v.options).map(([key, value]) => [
                  key,
                  value ?? "Default",
                ]),
              ),
            }
          : {}),
        ...(v.prices ? { prices: v.prices } : {}),
        ...(v.quantities ? { quantities: v.quantities } : {}),
        sku: v.sku,
        ...(typeof v.thumbnail === "string" ? { thumbnail: v.thumbnail } : {}),
        title: v.title ?? v.sku,
      }))

    return {
      brand: parsedBrand,
      categories: parsedCategories ?? [],
      description: raw.description ?? "",
      handle: raw.handle,
      images: (parsedImages ?? []).filter(
        (im): im is { url: string } => im.url !== null && im.url !== undefined,
      ),
      ...(options.length === 0 ? {} : { options }),
      salesChannelNames: ["Default Sales Channel"],
      shippingProfileName: "Default Shipping Profile",
      ...(typeof raw.thumbnail === "string"
        ? { thumbnail: raw.thumbnail }
        : {}),
      title: raw.title,
      ...(variants.length === 0 ? {} : { variants }),
      weight: 1,
    }
  })
