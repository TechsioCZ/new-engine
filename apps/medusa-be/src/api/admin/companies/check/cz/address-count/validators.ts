import { z } from "@medusajs/framework/zod"

export const AdminCompaniesCheckCzAddressCountSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
})

export type AdminCompaniesCheckCzAddressCountSchemaType = z.infer<
  typeof AdminCompaniesCheckCzAddressCountSchema
>
