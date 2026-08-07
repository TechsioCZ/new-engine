import { z } from "@medusajs/framework/zod"
import { STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION } from "../../../modules/storefront-text/catalog"
import {
  isStorefrontTextMarketLocalePair,
  STOREFRONT_TEXT_LOCALES,
  STOREFRONT_TEXT_MARKET_IDS,
  STOREFRONT_TEXT_NAMESPACES,
  STOREFRONT_TEXT_STATUSES,
} from "../../../modules/storefront-text/configuration"

export const STOREFRONT_TEXT_SEARCH_SCOPES = ["all", "value"] as const

const isJsonObject = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const AdminGetStorefrontTextsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    locale: z.enum(STOREFRONT_TEXT_LOCALES).optional(),
    market: z.enum(STOREFRONT_TEXT_MARKET_IDS).optional(),
    namespace: z.enum(STOREFRONT_TEXT_NAMESPACES).optional(),
    offset: z.coerce.number().int().min(0).optional().default(0),
    q: z.string().trim().optional(),
    search_scope: z
      .enum(STOREFRONT_TEXT_SEARCH_SCOPES)
      .optional()
      .default("all"),
    status: z.enum(STOREFRONT_TEXT_STATUSES).optional(),
  })
  .strict()
  .superRefine(({ locale, market }, context) => {
    if (locale && market && !isStorefrontTextMarketLocalePair(market, locale)) {
      context.addIssue({
        code: "custom",
        message: `Locale "${locale}" does not belong to market "${market}"`,
        path: ["locale"],
      })
    }
  })

export const AdminUpdateStorefrontTextSchema = z
  .object({
    override_value: z.string().trim().min(1).nullable().optional(),
    status: z.enum(STOREFRONT_TEXT_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })

export const AdminGetStorefrontTextCatalogSchema = z
  .object({
    market: z.enum(STOREFRONT_TEXT_MARKET_IDS),
  })
  .strict()

export const AdminStorefrontTextCatalogSchema = z
  .object({
    locale: z.enum(STOREFRONT_TEXT_LOCALES),
    market: z.enum(STOREFRONT_TEXT_MARKET_IDS),
    messages: z
      .unknown()
      .refine(isJsonObject, "Catalog messages must be a JSON object"),
    schema_version: z.literal(STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION),
  })
  .strict()
  .superRefine(({ locale, market }, context) => {
    if (!isStorefrontTextMarketLocalePair(market, locale)) {
      context.addIssue({
        code: "custom",
        message: `Locale "${locale}" does not belong to market "${market}"`,
        path: ["locale"],
      })
    }
  })

export const AdminImportStorefrontTextCatalogSchema = z
  .object({
    catalog: AdminStorefrontTextCatalogSchema,
    market: z.enum(STOREFRONT_TEXT_MARKET_IDS),
  })
  .strict()

export type AdminGetStorefrontTextsSchemaType = z.infer<
  typeof AdminGetStorefrontTextsSchema
>
export type AdminGetStorefrontTextCatalogSchemaType = z.infer<
  typeof AdminGetStorefrontTextCatalogSchema
>
export type AdminImportStorefrontTextCatalogSchemaType = z.infer<
  typeof AdminImportStorefrontTextCatalogSchema
>
export type AdminUpdateStorefrontTextSchemaType = z.infer<
  typeof AdminUpdateStorefrontTextSchema
>
