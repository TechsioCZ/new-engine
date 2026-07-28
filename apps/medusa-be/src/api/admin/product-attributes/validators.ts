import { z } from "@medusajs/framework/zod"

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

const listStatus = z.enum(["active", "deleted", "all"])

export const AdminGetProductAttributeDefinitionsSchema = z
  .object({
    input_type: z.enum(["text", "select"]).optional(),
    is_public: queryBoolean,
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    order: z.string().optional(),
    q: z.string().trim().optional(),
    status: listStatus.default("active"),
  })
  .strict()

export const AdminCreateProductAttributeDefinitionSchema = z
  .object({
    input_type: z.enum(["text", "select"]),
    is_public: z.boolean().default(false),
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
  })
  .strict()

export const AdminUpdateProductAttributeDefinitionSchema = z
  .object({
    input_type: z.enum(["text", "select"]).optional(),
    is_public: z.boolean().optional(),
    label: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  })

export const AdminGetProductAttributeOptionsSchema = z
  .object({
    definition_id: z.string().trim().min(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    order: z.string().optional(),
    q: z.string().trim().optional(),
    status: listStatus.default("active"),
  })
  .strict()

export const AdminCreateProductAttributeOptionSchema = z
  .object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
  })
  .strict()

export const AdminUpdateProductAttributeOptionSchema = z
  .object({
    label: z.string().trim().min(1),
  })
  .strict()

const setTextOperation = z
  .object({
    action: z.literal("set"),
    definition_id: z.string().trim().min(1),
    text_value: z.string().trim().min(1),
  })
  .strict()

const setOptionOperation = z
  .object({
    action: z.literal("set"),
    definition_id: z.string().trim().min(1),
    option_id: z.string().trim().min(1),
  })
  .strict()

const removeOperation = z
  .object({
    action: z.literal("remove"),
    definition_id: z.string().trim().min(1),
  })
  .strict()

export const AdminSetProductAttributesSchema = z
  .object({
    operations: z
      .array(z.union([setTextOperation, setOptionOperation, removeOperation]))
      .min(1),
  })
  .strict()

export type AdminGetProductAttributeDefinitionsSchemaType = z.infer<
  typeof AdminGetProductAttributeDefinitionsSchema
>
export type AdminCreateProductAttributeDefinitionSchemaType = z.infer<
  typeof AdminCreateProductAttributeDefinitionSchema
>
export type AdminUpdateProductAttributeDefinitionSchemaType = z.infer<
  typeof AdminUpdateProductAttributeDefinitionSchema
>
export type AdminGetProductAttributeOptionsSchemaType = z.infer<
  typeof AdminGetProductAttributeOptionsSchema
>
export type AdminCreateProductAttributeOptionSchemaType = z.infer<
  typeof AdminCreateProductAttributeOptionSchema
>
export type AdminUpdateProductAttributeOptionSchemaType = z.infer<
  typeof AdminUpdateProductAttributeOptionSchema
>
export type AdminSetProductAttributesSchemaType = z.infer<
  typeof AdminSetProductAttributesSchema
>
