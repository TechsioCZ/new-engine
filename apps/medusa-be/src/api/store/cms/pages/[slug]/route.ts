import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { PAYLOAD_MODULE } from "../../../../../modules/payload"
import type PayloadModuleService from "../../../../../modules/payload/service"
import { optionalStringParam } from "../../../../../utils/query-params"

/** Query schema for fetching a single CMS page. */
export const StoreCmsPageSchema = z.object({
  locale: optionalStringParam,
})

/** Parsed query type for the CMS page endpoint. */
export type StoreCmsPageSchemaType = z.infer<typeof StoreCmsPageSchema>

/** Store API handler for returning a published CMS page by slug. */
export async function GET(
  req: MedusaRequest<unknown, StoreCmsPageSchemaType>,
  res: MedusaResponse
) {
  const { slug } = req.params
  if (!slug) {
    return res.status(400).json({ message: "Missing slug" })
  }
  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  const page = await cmsService.getPublishedPage(slug, req.locale)

  if (!page) {
    return res.status(404).json({ message: "Page not found" })
  }

  return res.json({ page })
}
