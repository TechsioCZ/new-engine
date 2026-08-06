import { z } from "@medusajs/framework/zod"

export const StoreDeactivateCustomerAccountSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict()

export const StoreConfirmDeactivateCustomerAccountSchema = z
  .object({
    token: z.string().min(1),
  })
  .strict()

export type StoreDeactivateCustomerAccountSchemaType = z.infer<
  typeof StoreDeactivateCustomerAccountSchema
>

export type StoreConfirmDeactivateCustomerAccountSchemaType = z.infer<
  typeof StoreConfirmDeactivateCustomerAccountSchema
>
