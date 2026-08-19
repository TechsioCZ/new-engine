import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../../../modules/payload"
import type PayloadModuleService from "../../../../../../modules/payload/service"
import { StoreCmsLocaleSchema } from "../../../locales"

export const StoreCmsPageByIdSchema = z.object({
  locale: StoreCmsLocaleSchema,
})

export type StoreCmsPageByIdSchemaType = z.infer<typeof StoreCmsPageByIdSchema>

export async function GET(
  req: MedusaRequest<unknown, StoreCmsPageByIdSchemaType>,
  res: MedusaResponse
) {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: "Missing Payload document ID" })
  }
  const service = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  try {
    const page = await service.getPublishedPageById(
      id,
      req.validatedQuery.locale
    )
    return page
      ? res.json({ page })
      : res.status(404).json({ message: "Page not found" })
  } catch {
    return res.status(503).json({ message: "CMS source is unavailable" })
  }
}
