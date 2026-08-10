import { z } from "@medusajs/framework/zod"

import { JsonMetadataSchema } from "../../../../../../lib/json-metadata"

const CUSTOMER_GROUPS_BATCH_MAX = 500

const CustomerGroupInputSchema = z
  .object({
    code: z.string().min(1).optional(),
    customer_group_id: z.string().min(1).optional(),
    erp_code: z.string().min(1).optional(),
    identifier_type: z.enum(["customer_group_id", "name", "code", "erp_code"]),
    metadata: JsonMetadataSchema.optional(),
    name: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (
      value.identifier_type === "customer_group_id" &&
      value.customer_group_id === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "customer_group_id is required when identifier_type is 'customer_group_id'",
        path: ["customer_group_id"],
      })
    }
    if (value.identifier_type === "code" && value.code === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "code is required when identifier_type is 'code'",
        path: ["code"],
      })
    }
    if (value.identifier_type === "erp_code" && value.erp_code === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "erp_code is required when identifier_type is 'erp_code'",
        path: ["erp_code"],
      })
    }
  })

export const UpsertCustomerGroupsBatchSchema = z.object({
  customer_groups: z
    .array(CustomerGroupInputSchema)
    .min(1)
    .max(CUSTOMER_GROUPS_BATCH_MAX),
})

export type UpsertCustomerGroupsBatchSchemaType = z.infer<
  typeof UpsertCustomerGroupsBatchSchema
>
export type CustomerGroupInputSchemaType = z.infer<
  typeof CustomerGroupInputSchema
>
