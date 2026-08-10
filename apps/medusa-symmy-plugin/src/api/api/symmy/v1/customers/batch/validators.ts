import { z } from "@medusajs/framework/zod"

import { JsonMetadataSchema } from "../../../../../../lib/json-metadata"

const CUSTOMERS_BATCH_MAX = 500
const CUSTOMER_ADDRESSES_MAX = 50
const CUSTOMER_GROUP_CODES_MAX = 100

const CustomerAddressInputSchema = z.object({
  address_1: z.string().min(1),
  address_2: z.string().optional(),
  address_id: z.string().min(1).optional(),
  city: z.string().min(1),
  company: z.string().optional(),
  country_code: z
    .string()
    .min(1)
    .transform((value) => value.toLowerCase()),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  postal_code: z.string().min(1),
})

const CustomerInputSchema = z
  .object({
    addresses: z
      .array(CustomerAddressInputSchema)
      .max(CUSTOMER_ADDRESSES_MAX)
      .optional(),
    company_name: z.string().optional(),
    customer_group_codes: z
      .array(z.string().min(1))
      .max(CUSTOMER_GROUP_CODES_MAX)
      .optional(),
    customer_id: z.string().min(1).optional(),
    email: z.email().optional(),
    first_name: z.string().min(1),
    identifier_type: z.enum([
      "email",
      "erp_id",
      "customer_id",
      "vat_id",
      "company_registration_number",
    ]),
    last_name: z.string().min(1),
    metadata: JsonMetadataSchema.optional(),
    phone: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.identifier_type === "email" && value.email === undefined) {
      ctx.addIssue({
        code: "custom",
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
        typeof value.metadata?.[identifierType] !== "string"
      ) {
        ctx.addIssue({
          code: "custom",
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
        code: "custom",
        message:
          "customer_id is required when identifier_type is 'customer_id'",
        path: ["customer_id"],
      })
    }
  })

export const UpsertCustomersBatchSchema = z.object({
  customers: z.array(CustomerInputSchema).min(1).max(CUSTOMERS_BATCH_MAX),
})

export type UpsertCustomersBatchSchemaType = z.infer<
  typeof UpsertCustomersBatchSchema
>
export type CustomerInputType = z.infer<typeof CustomerInputSchema>
export type CustomerAddressInputType = z.infer<
  typeof CustomerAddressInputSchema
>
