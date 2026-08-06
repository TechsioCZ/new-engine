import { z } from "@medusajs/framework/zod"

import {
  GLS_COUNTRY_CODES,
  GLS_PRINTER_TYPES,
} from "../../../modules/gls-client/types"

/** Zod schema for MyGLS config updates (admin API). */
export const PostAdminGLSConfigSchema = z.object({
  client_number: z.number().int().positive().nullable().optional(),
  country_code: z.enum(GLS_COUNTRY_CODES).optional(),
  hide_phone_number_on_labels: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
  password: z.string().max(255).nullable().optional(),
  print_position: z.number().int().min(1).max(4).optional(),
  sender_city: z.string().max(80).optional(),
  sender_country: z.string().max(3).optional(),
  sender_email: z.email().max(100).optional(),
  sender_house_number: z.string().max(20).optional(),
  sender_house_number_info: z.string().max(50).optional(),
  sender_name: z.string().max(100).optional(),
  sender_phone: z.string().max(30).optional(),
  sender_street: z.string().max(100).optional(),
  sender_zip_code: z.string().max(20).optional(),
  type_of_printer: z.enum(GLS_PRINTER_TYPES).optional(),
  username: z.email().max(255).optional(),
  webshop_engine: z.string().max(100).optional(),
})

export type PostAdminGLSConfigSchemaType = z.infer<
  typeof PostAdminGLSConfigSchema
>
