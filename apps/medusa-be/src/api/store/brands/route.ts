import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  hasValidLocalizedBrandResponse,
  readPublishedBrandLocalization,
  readPublishedBrandScope,
  sendBrandLocalizationFailure,
  sendPublishedBrandScopeFailure,
} from "../../../utils/published-brand-scope"
import type { StoreBrandsSchemaType } from "./validators"

type StoreBrandRequest = MedusaRequest<unknown, StoreBrandsSchemaType> & {
  publishable_key_context?: { sales_channel_ids?: unknown } | null
}

export async function GET(req: StoreBrandRequest, res: MedusaResponse) {
  const publicationScope = await readPublishedBrandScope({
    container: req.scope,
    locale: req.locale,
    salesChannelIds: req.publishable_key_context?.sales_channel_ids,
  })
  if (
    publicationScope.kind === "invalid-response" ||
    publicationScope.kind === "unavailable"
  ) {
    sendPublishedBrandScopeFailure(publicationScope, res)
    return
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  if (publicationScope.kind === "source") {
    const { data: sourceBrands } = await query.graph({
      entity: "brand",
      ...req.queryConfig,
    })
    res.json({ brands: sourceBrands })
    return
  }

  const brandIds = [...publicationScope.brandIds]
  if (brandIds.length === 0) {
    res.json({ brands: [] })
    return
  }

  const localization = await readPublishedBrandLocalization({
    brandIds,
    container: req.scope,
    market: publicationScope.market,
  })
  if (localization.kind === "failure") {
    sendBrandLocalizationFailure(localization.code, res)
    return
  }

  const { data: brands } = await query.graph(
    {
      entity: "brand",
      ...req.queryConfig,
      filters: {
        id: brandIds,
      },
    },
    { locale: req.locale }
  )
  if (
    !hasValidLocalizedBrandResponse(brands, brandIds, req.queryConfig.fields)
  ) {
    sendBrandLocalizationFailure("INVALID_BRAND_LOCALIZATION_RESPONSE", res)
    return
  }

  res.json({ brands })
}
