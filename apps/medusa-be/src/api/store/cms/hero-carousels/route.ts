import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../modules/payload"
import type PayloadModuleService from "../../../../modules/payload/service"
import {
  optionalPositiveIntParam,
  optionalStringParam,
} from "../../../../utils/query-params"
import { resolveStoreCmsLocale, StoreCmsLocaleQuerySchema } from "../locales"

export const StoreCmsHeroCarouselsSchema = z.object({
  locale: StoreCmsLocaleQuerySchema,
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
  const locale = resolveStoreCmsLocale(req.locale ?? req.validatedQuery.locale)

  try {
    const heroCarousels = await cmsService.listHeroCarousels({
      limit,
      locale,
      page,
      sort,
    })

    return res.json({ heroCarousels })
  } catch {
    return res.status(503).json({ message: "CMS source is unavailable" })
  }
}
