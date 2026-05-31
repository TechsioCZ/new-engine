import { z } from "@medusajs/framework/zod"

const CUSTOMER_IDENTIFIERS_BATCH_MAX = 500

const CustomerIdentifierSchema = z
  .object({
    identifier_type: z.enum(["email", "customer_id", "erp_id"]),
    email: z.string().email().optional(),
    customer_id: z.string().min(1).optional(),
    erp_id: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const identifier = value[value.identifier_type]
    if (!identifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${value.identifier_type} is required when identifier_type is '${value.identifier_type}'`,
        path: [value.identifier_type],
      })
    }
  })

export const AssignCustomersToGroupBatchSchema = z.object({
  customer_identifiers: z
    .array(CustomerIdentifierSchema)
    .min(1)
    .max(CUSTOMER_IDENTIFIERS_BATCH_MAX),
})

export type AssignCustomersToGroupBatchSchemaType = z.infer<
  typeof AssignCustomersToGroupBatchSchema
>
