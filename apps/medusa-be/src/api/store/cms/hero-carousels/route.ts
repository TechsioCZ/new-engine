import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { PAYLOAD_MODULE } from "../../../../modules/payload"
import type PayloadModuleService from "../../../../modules/payload/service"
import { optionalPositiveIntParam, optionalStringParam } from "../../../../utils/query-params"

/** Query schema for fetching CMS hero carousel lists. */
export const StoreCmsHeroCarouselsSchema = z.object({
  locale: optionalStringParam,
  limit: optionalPositiveIntParam,
  page: optionalPositiveIntParam,
  sort: optionalStringParam,
})

/** Parsed query type for hero carousel listing. */
export type StoreCmsHeroCarouselsSchemaType = z.infer<
  typeof StoreCmsHeroCarouselsSchema
>

/** Store API handler returning hero carousels with list options. */
export async function GET(
  req: MedusaRequest<unknown, StoreCmsHeroCarouselsSchemaType>,
  res: MedusaResponse
) {
  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)

  const { limit, page, sort } = req.validatedQuery

  const heroCarousels = await cmsService.listHeroCarousels({
    limit,
    page,
    sort,
    locale: req.locale,
  })

  return res.json({ heroCarousels })
}
