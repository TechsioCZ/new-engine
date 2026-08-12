import { z as zod } from "@medusajs/framework/zod"

export const StoreGLSBranchesSchema = zod
  .object({
    cart_id: zod.string().trim().min(1),
    limit: zod.coerce.number().int().min(1).max(100).default(50),
    q: zod.string().trim().max(120).optional(),
  })
  .strict()

export type StoreGLSBranchesSchemaType = zod.infer<
  typeof StoreGLSBranchesSchema
>
