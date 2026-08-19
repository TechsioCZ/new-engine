import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { PAYLOAD_MODULE } from "../../../../../modules/payload"
import type PayloadModuleService from "../../../../../modules/payload/service"
import { resolveStoreCmsLocale, StoreCmsLocaleQuerySchema } from "../../locales"

/** Query schema for fetching localized footer navigation. */
export const StoreCmsFooterNavigationSchema = z.object({
  locale: StoreCmsLocaleQuerySchema,
})

export type StoreCmsFooterNavigationSchemaType = z.infer<
  typeof StoreCmsFooterNavigationSchema
>

/** Store API handler for Payload-managed footer navigation. */
export async function GET(
  req: MedusaRequest<unknown, StoreCmsFooterNavigationSchemaType>,
  res: MedusaResponse
) {
  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  const locale = resolveStoreCmsLocale(req.locale ?? req.validatedQuery.locale)
  const footerNavigation = await cmsService.getFooterNavigation(locale)

  return res.json({ footerNavigation })
}
