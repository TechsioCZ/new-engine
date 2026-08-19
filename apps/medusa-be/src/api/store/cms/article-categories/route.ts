import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../modules/payload"
import type PayloadModuleService from "../../../../modules/payload/service"
import { optionalStringParam } from "../../../../utils/query-params"
import { StoreCmsLocaleSchema } from "../locales"

/** Query schema for fetching CMS article categories with articles. */
export const StoreCmsArticleCategoriesSchema = z.object({
  locale: StoreCmsLocaleSchema,
  categorySlug: optionalStringParam,
})

/** Parsed query type for article category listing. */
export type StoreCmsArticleCategoriesSchemaType = z.infer<
  typeof StoreCmsArticleCategoriesSchema
>

/** Store API handler returning article categories with articles. */
export async function GET(
  req: MedusaRequest<unknown, StoreCmsArticleCategoriesSchemaType>,
  res: MedusaResponse
) {
  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)

  const { categorySlug, locale } = req.validatedQuery

  try {
    const articleCategories =
      await cmsService.listArticleCategoriesWithArticles({
        locale,
        categorySlug,
      })

    return res.json({ articleCategories })
  } catch {
    return res.status(503).json({ message: "CMS source is unavailable" })
  }
}
