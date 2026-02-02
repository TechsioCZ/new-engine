import { z } from "zod"

/** Schema for rule-attribute-options query params */
export const RuleAttributeOptionsQuerySchema = z.object({
  promotion_type: z.string().optional(),
  application_method_type: z.string().optional(),
  application_method_target_type: z.string().optional(),
})

/** Schema for rule-value-options query params */
export const RuleValueOptionsQuerySchema = z.object({
  q: z.string().optional(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  offset: z.coerce.number().min(0).optional().default(0),
  // Additional fields passed by admin UI
  application_method_target_type: z.string().optional(),
  promotion_type: z.string().optional(),
})
