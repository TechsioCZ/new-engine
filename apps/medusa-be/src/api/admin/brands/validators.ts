import { z } from "@medusajs/framework/zod"

const optionalHandle = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional()
)

const queryBoolean = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return
  }

  if (value === true || value === "true") {
    return true
  }

  if (value === false || value === "false") {
    return false
  }

  return value
}, z.boolean().optional())

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().optional()
)

export const BrandAttributeSchema = z
  .object({
    name: z.string().trim().min(1),
    value: z.string(),
  })
  .strict()

export const AdminGetBrandsSchema = z
  .object({
    handle: z.string().trim().optional(),
    include_deleted: queryBoolean.optional().default(false),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    order: z.string().optional(),
    order_by: z.string().optional(),
    q: z.string().trim().optional(),
  })
  .strict()

export const AdminGetBrandAttributeTypesSchema = z
  .object({
    include_deleted: queryBoolean.optional().default(false),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    name: z.string().trim().optional(),
    offset: z.coerce.number().int().min(0).optional().default(0),
    order: z.string().optional(),
    order_by: z.string().optional(),
    q: z.string().trim().optional(),
  })
  .strict()

export const AdminCreateBrandSchema = z
  .object({
    attributes: z.array(BrandAttributeSchema).optional().default([]),
    gpsrContactEmail: optionalText,
    gpsrEuropeanResellerContactEmail: optionalText,
    gpsrEuropeanResellerManufacturingCompanyName: optionalText,
    gpsrEuropeanResellerPostalAddress: optionalText,
    gpsrManufacturedOutsideEu: z.boolean().optional().default(false),
    gpsrManufacturingCompanyName: optionalText,
    gpsrPostalAddress: optionalText,
    handle: optionalHandle,
    title: z.string().trim().min(1),
  })
  .strict()

export const AdminUpdateBrandSchema = z
  .object({
    attributes: z.array(BrandAttributeSchema).optional(),
    gpsrContactEmail: optionalText,
    gpsrEuropeanResellerContactEmail: optionalText,
    gpsrEuropeanResellerManufacturingCompanyName: optionalText,
    gpsrEuropeanResellerPostalAddress: optionalText,
    gpsrManufacturedOutsideEu: z.boolean().optional(),
    gpsrManufacturingCompanyName: optionalText,
    gpsrPostalAddress: optionalText,
    handle: optionalHandle,
    title: z.string().trim().min(1).optional(),
  })
  .strict()

export const AdminCreateBrandAttributeTypeSchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict()

export const AdminSetProductBrandsSchema = z
  .object({
    brand_ids: z.array(z.string().trim().min(1)).max(1).default([]),
  })
  .strict()

export const AdminSetBrandProductsSchema = z
  .object({
    product_ids: z.array(z.string().trim().min(1)).default([]),
  })
  .strict()

export const AdminGetBrandProductOptionsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    q: z.string().trim().optional(),
  })
  .strict()

export type AdminGetBrandsSchemaType = z.infer<typeof AdminGetBrandsSchema>
export type AdminGetBrandAttributeTypesSchemaType = z.infer<
  typeof AdminGetBrandAttributeTypesSchema
>
export type AdminCreateBrandSchemaType = z.infer<typeof AdminCreateBrandSchema>
export type AdminCreateBrandAttributeTypeSchemaType = z.infer<
  typeof AdminCreateBrandAttributeTypeSchema
>
export type AdminUpdateBrandSchemaType = z.infer<typeof AdminUpdateBrandSchema>
export type AdminSetProductBrandsSchemaType = z.infer<
  typeof AdminSetProductBrandsSchema
>
export type AdminSetBrandProductsSchemaType = z.infer<
  typeof AdminSetBrandProductsSchema
>
export type AdminGetBrandProductOptionsSchemaType = z.infer<
  typeof AdminGetBrandProductOptionsSchema
>
