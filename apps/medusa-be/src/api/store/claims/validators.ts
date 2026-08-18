import { z } from "@medusajs/framework/zod"

const emailSchema = z.string().trim().email().max(320)

export const StoreRequestClaimAccessSchema = z.object({
  email: emailSchema,
  order_number: z.string().trim().min(1).max(64),
})

export type StoreRequestClaimAccessSchemaType = z.infer<
  typeof StoreRequestClaimAccessSchema
>

export const StoreVerifyClaimAccessSchema = z.object({
  challenge_id: z.string().trim().min(1).max(128),
  code: z.string().regex(/^\d{6}$/),
})

export type StoreVerifyClaimAccessSchemaType = z.infer<
  typeof StoreVerifyClaimAccessSchema
>

const claimItemSchema = z.object({
  order_item_id: z.string().min(1).max(128).optional(),
  quantity: z.number().int().min(1).max(10_000),
  title: z.string().trim().min(1).max(500).optional(),
})

export const StoreCreateClaimSchema = z
  .object({
    access_token: z.string().min(32).max(256).optional(),
    attachment_urls: z.array(z.string().url().max(2048)).max(10).optional(),
    defect_description: z.string().trim().min(3).max(10_000).optional(),
    defect_discovered_at: z.string().datetime().optional(),
    email: emailSchema,
    items: z.array(claimItemSchema).min(1).max(100),
    order_number: z.string().trim().min(1).max(64).optional(),
    purchase_details: z.string().trim().min(3).max(5000).optional(),
    reason: z.string().trim().max(5000).optional(),
    requested_resolution: z
      .enum(["repair", "replacement", "discount", "refund"])
      .optional(),
    type: z.enum(["return", "complaint"]),
  })
  .superRefine((value, context) => {
    if (!(value.access_token || value.purchase_details)) {
      context.addIssue({
        code: "custom",
        message: "Purchase details are required without verified order access.",
        path: ["purchase_details"],
      })
    }
    if (!value.access_token && value.items.some((item) => !item.title)) {
      context.addIssue({
        code: "custom",
        message: "Item title is required without verified order access.",
        path: ["items"],
      })
    }
    if (value.access_token && value.items.some((item) => !item.order_item_id)) {
      context.addIssue({
        code: "custom",
        message: "Order item ID is required with verified order access.",
        path: ["items"],
      })
    }
    if (value.type === "complaint") {
      if (!value.defect_description) {
        context.addIssue({
          code: "custom",
          message: "Defect description is required for complaints.",
          path: ["defect_description"],
        })
      }
      if (!value.requested_resolution) {
        context.addIssue({
          code: "custom",
          message: "Requested resolution is required for complaints.",
          path: ["requested_resolution"],
        })
      }
    }
  })

export type StoreCreateClaimSchemaType = z.infer<typeof StoreCreateClaimSchema>
