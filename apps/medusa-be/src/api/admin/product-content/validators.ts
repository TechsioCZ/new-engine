import { z } from "@medusajs/framework/zod"

export const AdminUpdateProductContentSchema = z
  .object({
    composition: z.string(),
    description: z.string(),
    other: z.string(),
    usage: z.string(),
    warning: z.string(),
  })
  .strict()

export type AdminUpdateProductContentSchemaType = z.infer<
  typeof AdminUpdateProductContentSchema
>
