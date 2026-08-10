import { z } from "@medusajs/framework/zod"

/** Zod schema for Packeta config updates (admin API). */
export const PostAdminPacketaConfigSchema = z.object({
  environment: z.enum(["testing", "production"]),
  is_enabled: z.boolean().optional(),
  allow_live_operations: z.boolean().optional(),
  api_password: z.string().nullable().optional(),
  widget_api_key: z.string().nullable().optional(),
  widget_countries: z.array(z.enum(["sk", "cz", "hu", "ro"])).max(4).optional(),
  sender_label: z.string().max(50).optional(),
  eshop_id: z.string().max(50).optional(),
  default_label_format: z.enum(["A6", "A7"]).optional(),
  default_label_offset: z.number().int().min(0).max(3).optional(),
  cod_bank_account: z.string().nullable().optional(),
  cod_bank_code: z.string().nullable().optional(),
  cod_iban: z.string().nullable().optional(),
  cod_swift: z.string().nullable().optional(),
  sender_name: z.string().max(50).optional(),
  sender_street: z.string().max(60).optional(),
  sender_city: z.string().max(50).optional(),
  sender_zip_code: z.string().max(10).optional(),
  sender_country: z.string().max(3).optional(),
  sender_phone: z.string().max(20).optional(),
  sender_email: z.string().email().max(50).optional(),
})

export const PostAdminPacketaActiveProfileSchema = z.object({
  environment: z.enum(["testing", "production"]),
  confirmed: z.boolean(),
})

export type PostAdminPacketaConfigSchemaType = z.infer<
  typeof PostAdminPacketaConfigSchema
>

export type PostAdminPacketaActiveProfileSchemaType = z.infer<
  typeof PostAdminPacketaActiveProfileSchema
>
