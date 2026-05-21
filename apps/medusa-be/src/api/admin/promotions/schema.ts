import { z } from "@medusajs/framework/zod"

/** Schema for rule-attribute-options query params */
export const RuleAttributeOptionsQuerySchema = z.object({
  promotion_type: z.enum(["standard", "buyget"]).optional(),
  application_method_type: z.enum(["fixed", "percentage"]).optional(),
  application_method_target_type: z
    .enum(["order", "items", "shipping_methods"])
    .optional(),
})

export type RuleAttributeOptionsQuerySchemaType = z.infer<
  typeof RuleAttributeOptionsQuerySchema
>

/** Schema for rule-value-options query params */
export const RuleValueOptionsQuerySchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).optional(),
  q: z.string().optional(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
  // Additional fields passed by admin UI
  application_method_target_type: z.string().optional(),
  promotion_type: z.string().optional(),
})

export type RuleValueOptionsQuerySchemaType = z.infer<
  typeof RuleValueOptionsQuerySchema
>
