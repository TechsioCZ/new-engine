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

export const ProducerAttributeSchema = z
  .object({
    name: z.string().trim().min(1),
    value: z.string(),
  })
  .strict()

export const AdminGetProducersSchema = z
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

export const AdminGetProducerAttributeTypesSchema = z
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

export const AdminCreateProducerSchema = z
  .object({
    attributes: z.array(ProducerAttributeSchema).optional().default([]),
    handle: optionalHandle,
    title: z.string().trim().min(1),
  })
  .strict()

export const AdminUpdateProducerSchema = z
  .object({
    attributes: z.array(ProducerAttributeSchema).optional(),
    handle: optionalHandle,
    title: z.string().trim().min(1).optional(),
  })
  .strict()

export const AdminCreateProducerAttributeTypeSchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict()

export const AdminSetProductProducersSchema = z
  .object({
    producer_ids: z.array(z.string().trim().min(1)).max(1).default([]),
  })
  .strict()

export const AdminSetProducerProductsSchema = z
  .object({
    product_ids: z.array(z.string().trim().min(1)).default([]),
  })
  .strict()

export const AdminGetProducerProductOptionsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    q: z.string().trim().optional(),
  })
  .strict()

export type AdminGetProducersSchemaType = z.infer<
  typeof AdminGetProducersSchema
>
export type AdminGetProducerAttributeTypesSchemaType = z.infer<
  typeof AdminGetProducerAttributeTypesSchema
>
export type AdminCreateProducerSchemaType = z.infer<
  typeof AdminCreateProducerSchema
>
export type AdminCreateProducerAttributeTypeSchemaType = z.infer<
  typeof AdminCreateProducerAttributeTypeSchema
>
export type AdminUpdateProducerSchemaType = z.infer<
  typeof AdminUpdateProducerSchema
>
export type AdminSetProductProducersSchemaType = z.infer<
  typeof AdminSetProductProducersSchema
>
export type AdminSetProducerProductsSchemaType = z.infer<
  typeof AdminSetProducerProductsSchema
>
export type AdminGetProducerProductOptionsSchemaType = z.infer<
  typeof AdminGetProducerProductOptionsSchema
>
