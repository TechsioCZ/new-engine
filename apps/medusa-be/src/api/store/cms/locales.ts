import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

/** Payload storefront locales are deliberately closed to the four live markets. */
export const StoreCmsLocaleSchema = z.enum(["sk", "cs", "hu", "ro"])
export const StoreCmsLocaleQuerySchema = StoreCmsLocaleSchema.optional()

export type StoreCmsLocale = z.infer<typeof StoreCmsLocaleSchema>

export const resolveStoreCmsLocale = (locale?: string): StoreCmsLocale => {
  const result = StoreCmsLocaleSchema.safeParse(locale)
  if (result.success) {
    return result.data
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    locale ? `Unsupported CMS locale "${locale}"` : "Field 'locale' is required"
  )
}
