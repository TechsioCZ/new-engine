import { z } from "@medusajs/framework/zod"

const optionalText = z.preprocess(
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

export const AdminGetMeasurementUnitsSchema = z
  .object({
    code: z.string().trim().optional(),
    include_deleted: queryBoolean.optional().default(false),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    order: z.string().optional(),
    order_by: z.string().optional(),
    q: z.string().trim().optional(),
  })
  .strict()

export const AdminCreateMeasurementUnitSchema = z
  .object({
    code: z.string().trim().min(1),
    description: optionalText,
    name: z.string().trim().min(1),
    symbol: z.string().trim().min(1),
  })
  .strict()

export const AdminUpdateMeasurementUnitSchema = z
  .object({
    code: optionalText,
    description: optionalText.nullable(),
    name: optionalText,
    symbol: optionalText,
  })
  .strict()

export const AdminSetProductMeasurementSchema = z
  .object({
    measurement_unit_id: z.string().trim().min(1),
    product_unit_quantity: z.coerce.number().positive(),
  })
  .strict()

export type AdminGetMeasurementUnitsSchemaType = z.infer<
  typeof AdminGetMeasurementUnitsSchema
>
export type AdminCreateMeasurementUnitSchemaType = z.infer<
  typeof AdminCreateMeasurementUnitSchema
>
export type AdminUpdateMeasurementUnitSchemaType = z.infer<
  typeof AdminUpdateMeasurementUnitSchema
>
export type AdminSetProductMeasurementSchemaType = z.infer<
  typeof AdminSetProductMeasurementSchema
>
