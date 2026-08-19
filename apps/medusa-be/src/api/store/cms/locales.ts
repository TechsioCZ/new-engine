import { z } from "@medusajs/framework/zod"

/** Payload storefront locales are deliberately closed to the four live markets. */
export const StoreCmsLocaleSchema = z.enum(["sk", "cs", "hu", "ro"])

export type StoreCmsLocale = z.infer<typeof StoreCmsLocaleSchema>
