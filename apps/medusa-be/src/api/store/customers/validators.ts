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

export const StoreCreateCustomerAccountSchema = z
  .object({
    company_name: z.string().nullable().optional(),
    email: z.email(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    phone: z.string().nullable().optional(),
  })
  .strict()

export type StoreDeactivateCustomerAccountSchemaType = z.infer<
  typeof StoreDeactivateCustomerAccountSchema
>

export type StoreConfirmDeactivateCustomerAccountSchemaType = z.infer<
  typeof StoreConfirmDeactivateCustomerAccountSchema
>

export type StoreCreateCustomerAccountSchemaType = z.infer<
  typeof StoreCreateCustomerAccountSchema
>
