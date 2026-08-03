import { z } from "@medusajs/framework/zod"

export const StoreDeactivateCustomerAccountSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export type StoreDeactivateCustomerAccountSchemaType = z.infer<
  typeof StoreDeactivateCustomerAccountSchema
>
