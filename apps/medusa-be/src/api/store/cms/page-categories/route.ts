import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../modules/payload"
import type PayloadModuleService from "../../../../modules/payload/service"
import { optionalStringParam } from "../../../../utils/query-params"
import { resolveStoreCmsLocale, StoreCmsLocaleQuerySchema } from "../locales"

/** Query schema for fetching CMS page categories with pages. */
export const StoreCmsPageCategoriesSchema = z.object({
  locale: StoreCmsLocaleQuerySchema,
  categorySlug: optionalStringParam,
})

/** Parsed query type for page category listing. */
export type StoreCmsPageCategoriesSchemaType = z.infer<
  typeof StoreCmsPageCategoriesSchema
>

/** Store API handler returning page categories with pages. */
export async function GET(
  req: MedusaRequest<unknown, StoreCmsPageCategoriesSchemaType>,
  res: MedusaResponse
) {
  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)

  const { categorySlug } = req.validatedQuery
  const locale = resolveStoreCmsLocale(req.locale ?? req.validatedQuery.locale)

  try {
    const pageCategories = await cmsService.listPageCategoriesWithPages({
      locale,
      categorySlug,
    })

    return res.json({ pageCategories })
  } catch {
    return res.status(503).json({ message: "CMS source is unavailable" })
  }
}
