import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

import { PAYLOAD_MODULE } from "../../../../modules/payload"
import type PayloadModuleService from "../../../../modules/payload/service"
import { optionalStringParam } from "../../../../utils/query-params"

/** Query schema for fetching CMS article categories with articles. */
export const StoreCmsArticleCategoriesSchema = z.object({
  categorySlug: optionalStringParam,
  locale: optionalStringParam,
})

/** Parsed query type for article category listing. */
export type StoreCmsArticleCategoriesSchemaType = z.infer<
  typeof StoreCmsArticleCategoriesSchema
>

/** Store API handler returning article categories with articles. */
const getArticleCategories = async (
  req: MedusaRequest<unknown, StoreCmsArticleCategoriesSchemaType>,
  res: MedusaResponse,
) => {
  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)

  const { categorySlug } = req.validatedQuery

  const articleCategories = await cmsService.listArticleCategoriesWithArticles({
    categorySlug,
    locale: req.locale,
  })

  return res.json({ articleCategories })
}

export { getArticleCategories as GET }
