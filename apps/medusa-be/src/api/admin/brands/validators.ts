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

const normalizeOptionalText = (value: unknown) => {
  if (value === null) {
    return null
  }

  if (typeof value !== "string") {
    return value
  }

  const normalized = value.trim()
  return normalized.length ? normalized : null
}

const optionalText = z.preprocess(
  normalizeOptionalText,
  z.string().trim().nullable().optional()
)

const optionalEmail = z.preprocess(
  normalizeOptionalText,
  z.string().trim().email().nullable().optional()
)

const addGpsrConditionalIssues = (
  value: {
    gpsr_european_reseller_contact_email?: string | null | undefined
    gpsr_european_reseller_manufacturing_company_name?:
      | string
      | null
      | undefined
    gpsr_european_reseller_postal_address?: string | null | undefined
    gpsr_manufactured_outside_eu?: boolean | undefined
  },
  context: z.RefinementCtx
) => {
  const requiredFields = [
    "gpsr_european_reseller_manufacturing_company_name",
    "gpsr_european_reseller_postal_address",
    "gpsr_european_reseller_contact_email",
  ] as const

  if (value.gpsr_manufactured_outside_eu) {
    for (const field of requiredFields) {
      if (!value[field]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required when the brand is manufactured outside the EU",
          path: [field],
        })
      }
    }
  } else {
    for (const field of requiredFields) {
      if (value[field]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be empty when the brand is manufactured inside the EU",
          path: [field],
        })
      }
    }
  }
}

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

export const AdminGetBrandProductsSchema = z
  .object({
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
    gpsr_contact_email: optionalEmail,
    gpsr_european_reseller_contact_email: optionalEmail,
    gpsr_european_reseller_manufacturing_company_name: optionalText,
    gpsr_european_reseller_postal_address: optionalText,
    gpsr_manufactured_outside_eu: z.boolean().optional().default(false),
    gpsr_manufacturing_company_name: optionalText,
    gpsr_postal_address: optionalText,
    handle: optionalHandle,
    title: z.string().trim().min(1),
  })
  .strict()
  .superRefine(addGpsrConditionalIssues)

export const AdminUpdateBrandSchema = z
  .object({
    attributes: z.array(BrandAttributeSchema).optional(),
    gpsr_contact_email: optionalEmail,
    gpsr_european_reseller_contact_email: optionalEmail,
    gpsr_european_reseller_manufacturing_company_name: optionalText,
    gpsr_european_reseller_postal_address: optionalText,
    gpsr_manufactured_outside_eu: z.boolean().optional(),
    gpsr_manufacturing_company_name: optionalText,
    gpsr_postal_address: optionalText,
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

export const AdminUpdateBrandProductsSchema = z
  .object({
    add: z.array(z.string().trim().min(1)).default([]),
    remove: z.array(z.string().trim().min(1)).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const addProductIds = new Set(value.add)

    for (const productId of new Set(value.remove)) {
      if (addProductIds.has(productId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A product cannot be added and removed in the same request",
          path: ["remove"],
        })
      }
    }
  })

export const AdminGetBrandProductOptionsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    q: z.string().trim().optional(),
  })
  .strict()

export type AdminGetBrandsSchemaType = z.infer<typeof AdminGetBrandsSchema>
export type AdminGetBrandProductsSchemaType = z.infer<
  typeof AdminGetBrandProductsSchema
>
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
export type AdminUpdateBrandProductsSchemaType = z.infer<
  typeof AdminUpdateBrandProductsSchema
>
export type AdminGetBrandProductOptionsSchemaType = z.infer<
  typeof AdminGetBrandProductOptionsSchema
>
