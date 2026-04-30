import { z } from "@medusajs/framework/zod"

const CustomerAddressInputSchema = z.object({
  address_id: z.string().min(1).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  address_1: z.string().min(1),
  address_2: z.string().optional(),
  city: z.string().min(1),
  postal_code: z.string().min(1),
  country_code: z
    .string()
    .min(1)
    .transform((value) => value.toLowerCase()),
  phone: z.string().optional(),
})

const CustomerInputSchema = z
  .object({
    identifier_type: z.enum([
      "email",
      "erp_id",
      "customer_id",
      "vat_id",
      "company_registration_number",
    ]),
    email: z.string().email().optional(),
    customer_id: z.string().min(1).optional(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    phone: z.string().optional(),
    company_name: z.string().optional(),
    addresses: z.array(CustomerAddressInputSchema).optional(),
    customer_group_codes: z.array(z.string().min(1)).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.identifier_type === "email" && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "email is required when identifier_type is 'email'",
        path: ["email"],
      })
    }

    for (const identifierType of [
      "erp_id",
      "vat_id",
      "company_registration_number",
    ] as const) {
      if (
        value.identifier_type === identifierType &&
        !value.metadata?.[identifierType]
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `metadata.${identifierType} is required when identifier_type is '${identifierType}'`,
          path: ["metadata", identifierType],
        })
      }
    }

    if (
      value.identifier_type === "customer_id" &&
      typeof value.customer_id !== "string"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "customer_id is required when identifier_type is 'customer_id'",
        path: ["customer_id"],
      })
    }
  })

export const UpsertCustomersBatchSchema = z.object({
  customers: z.array(CustomerInputSchema).min(1),
})

export type UpsertCustomersBatchSchemaType = z.infer<
  typeof UpsertCustomersBatchSchema
>
export type CustomerInputType = z.infer<typeof CustomerInputSchema>
export type CustomerAddressInputType = z.infer<
  typeof CustomerAddressInputSchema
>
