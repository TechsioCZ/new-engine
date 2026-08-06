import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../../../modules/payload"
import type PayloadModuleService from "../../../../../../modules/payload/service"
import { optionalStringParam } from "../../../../../../utils/query-params"

/** Query schema for fetching one CMS article by Payload document ID. */
export const StoreCmsArticleByIdSchema = z.object({
  locale: optionalStringParam,
})

export type StoreCmsArticleByIdSchemaType = z.infer<
  typeof StoreCmsArticleByIdSchema
>

export async function GET(
  req: MedusaRequest<unknown, StoreCmsArticleByIdSchemaType>,
  res: MedusaResponse
) {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: "Missing Payload document ID" })
  }

  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  const article = await cmsService.getPublishedArticleById(id, req.locale)

  if (!article) {
    return res.status(404).json({ message: "Article not found" })
  }

  return res.json({ article })
}
