import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../../../modules/payload"
import type PayloadModuleService from "../../../../../../modules/payload/service"
import { StoreCmsLocaleSchema } from "../../../locales"

export const StoreCmsArticleByIdSchema = z.object({
  locale: StoreCmsLocaleSchema,
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
  const service = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  try {
    const article = await service.getPublishedArticleById(
      id,
      req.validatedQuery.locale
    )
    return article
      ? res.json({ article })
      : res.status(404).json({ message: "Article not found" })
  } catch {
    return res.status(503).json({ message: "CMS source is unavailable" })
  }
}
