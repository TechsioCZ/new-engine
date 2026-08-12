import { z } from "@medusajs/framework/zod"
import {
  GLS_COUNTRY_CODES,
  GLS_PRINTER_TYPES,
  GLS_STOREFRONT_COUNTRY_CODES,
} from "../../../modules/gls-client/types"

/** Zod schema for MyGLS config updates (admin API). */
export const PostAdminGLSConfigSchema = z.object({
  environment: z.enum(["testing", "production"]),
  is_enabled: z.boolean().optional(),
  username: z.string().email().max(255).optional(),
  password: z.string().max(255).nullable().optional(),
  client_number: z.number().int().positive().nullable().optional(),
  country_code: z.enum(GLS_COUNTRY_CODES).optional(),
  supported_countries: z
    .array(z.enum(GLS_STOREFRONT_COUNTRY_CODES))
    .max(GLS_STOREFRONT_COUNTRY_CODES.length)
    .optional(),
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

export const PostAdminGLSActiveProfileSchema = z.object({
  environment: z.enum(["testing", "production"]),
  confirmed: z.boolean(),
})

export type PostAdminGLSConfigSchemaType = z.infer<
  typeof PostAdminGLSConfigSchema
>

export type PostAdminGLSActiveProfileSchemaType = z.infer<
  typeof PostAdminGLSActiveProfileSchema
>
