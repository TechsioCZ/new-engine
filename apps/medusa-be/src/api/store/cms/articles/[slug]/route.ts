import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { PAYLOAD_MODULE } from "../../../../../modules/payload"
import type PayloadModuleService from "../../../../../modules/payload/service"
import { optionalStringParam } from "../../../../../utils/query-params"

/** Query schema for fetching a single CMS article. */
export const StoreCmsArticleSchema = z.object({
  locale: optionalStringParam,
})

/** Parsed query type for the CMS article endpoint. */
export type StoreCmsArticleSchemaType = z.infer<typeof StoreCmsArticleSchema>

/** Store API handler for returning a published CMS article by slug. */
export async function GET(
  req: MedusaRequest<unknown, StoreCmsArticleSchemaType>,
  res: MedusaResponse
) {
  const { slug } = req.params
  if (!slug) {
    return res.status(400).json({ message: "Missing slug" })
  }
  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)

  const article = await cmsService.getPublishedArticle(slug, req.locale)

  if (!article) {
    return res.status(404).json({ message: "Article not found" })
  }

  return res.json({ article })
}
