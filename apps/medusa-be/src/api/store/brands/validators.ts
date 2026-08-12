import { z } from "@medusajs/framework/zod"
import {
  createFindParams,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"

export const StoreBrandsSchema = createFindParams()
  .omit({ with_deleted: true })
  .strict()

export const StoreBrandsDetailSchema = createSelectParams().strict()

export const StoreBrandsDetailProductsSchema = createFindParams()
  .omit({ with_deleted: true })
  .merge(
    z.object({
      sales_channel_id: z.union([z.string(), z.array(z.string())]).optional(),
    })
  )
  .strict()

export type StoreBrandsSchemaType = z.infer<typeof StoreBrandsSchema>
export type StoreBrandsDetailSchemaType = z.infer<
  typeof StoreBrandsDetailSchema
>
export type StoreBrandsDetailProductsSchemaType = z.infer<
  typeof StoreBrandsDetailProductsSchema
>
