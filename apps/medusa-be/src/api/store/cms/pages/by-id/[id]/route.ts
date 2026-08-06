import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../../../modules/payload"
import type PayloadModuleService from "../../../../../../modules/payload/service"
import { optionalStringParam } from "../../../../../../utils/query-params"

/** Query schema for fetching one CMS page by Payload document ID. */
export const StoreCmsPageByIdSchema = z.object({
  locale: optionalStringParam,
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

  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  const page = await cmsService.getPublishedPageById(id, req.locale)

  if (!page) {
    return res.status(404).json({ message: "Page not found" })
  }

  return res.json({ page })
}
