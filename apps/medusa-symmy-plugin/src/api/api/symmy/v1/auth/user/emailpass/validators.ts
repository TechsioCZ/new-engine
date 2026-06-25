import { z } from "@medusajs/framework/zod"

export const PostSymmyAuthUserEmailPassSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type PostSymmyAuthUserEmailPassSchemaType = z.infer<
  typeof PostSymmyAuthUserEmailPassSchema
>
