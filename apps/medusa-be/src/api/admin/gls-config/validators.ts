import { z } from "@medusajs/framework/zod"
import {
  GLS_COUNTRY_CODES,
  GLS_PRINTER_TYPES,
} from "../../../modules/gls-client/types"

/** Zod schema for MyGLS config updates (admin API). */
export const PostAdminGLSConfigSchema = z.object({
  is_enabled: z.boolean().optional(),
  username: z.string().email().max(255).optional(),
  password: z.string().nullable().optional(),
  client_number: z.number().int().positive().nullable().optional(),
  country_code: z.enum(GLS_COUNTRY_CODES).optional(),
  webshop_engine: z.string().max(100).optional(),
  type_of_printer: z.enum(GLS_PRINTER_TYPES).optional(),
  print_position: z.number().int().min(1).max(4).optional(),
  hide_phone_number_on_labels: z.boolean().optional(),
  sender_name: z.string().max(100).optional(),
  sender_street: z.string().max(100).optional(),
  sender_house_number: z.string().max(20).optional(),
  sender_house_number_info: z.string().max(50).optional(),
  sender_city: z.string().max(80).optional(),
  sender_zip_code: z.string().max(20).optional(),
  sender_country: z.string().max(3).optional(),
  sender_phone: z.string().max(30).optional(),
  sender_email: z.string().email().max(100).optional(),
})

export type PostAdminGLSConfigSchemaType = z.infer<
  typeof PostAdminGLSConfigSchema
>
