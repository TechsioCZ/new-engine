import { z } from "@medusajs/framework/zod"

const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/u

export const PostAdminQrPaymentConfigSchema = z.object({
  iban: z
    .string()
    .transform((value) => value.replaceAll(/\s+/gu, "").toUpperCase())
    .pipe(z.string().regex(IBAN_REGEX, "Invalid IBAN"))
    .nullable()
    .optional(),
})

export type PostAdminQrPaymentConfigSchemaType = z.infer<
  typeof PostAdminQrPaymentConfigSchema
>
