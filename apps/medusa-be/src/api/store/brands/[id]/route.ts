import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  hasValidLocalizedBrandResponse,
  readPublishedBrandLocalization,
  readPublishedBrandScope,
  sendBrandLocalizationFailure,
  sendPublishedBrandScopeFailure,
} from "../../../../utils/published-brand-scope"
import type { StoreBrandsDetailSchemaType } from "../validators"

type StoreBrandRequest = MedusaRequest<unknown, StoreBrandsDetailSchemaType> & {
  publishable_key_context?: { sales_channel_ids?: unknown } | null
}

export async function GET(req: StoreBrandRequest, res: MedusaResponse) {
  const brandId = req.params.id ?? "-1"
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
  if (
    publicationScope.kind === "published" &&
    !publicationScope.brandIds.includes(brandId)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${brandId}" was not found`
    )
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  if (publicationScope.kind === "published") {
    const localization = await readPublishedBrandLocalization({
      brandIds: [brandId],
      container: req.scope,
      market: publicationScope.market,
    })
    if (localization.kind === "failure") {
      sendBrandLocalizationFailure(localization.code, res)
      return
    }
  }

  const querySpec = {
    entity: "brand",
    filters: {
      id: brandId,
    },
    ...req.queryConfig,
  }
  const { data: brands } =
    publicationScope.kind === "published"
      ? await query.graph(querySpec, { locale: req.locale })
      : await query.graph(querySpec)

  const brand = brands[0]
  if (!brand) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${req.params.id}" was not found`
    )
  }
  if (
    publicationScope.kind === "published" &&
    !hasValidLocalizedBrandResponse([brand], [brandId], req.queryConfig.fields)
  ) {
    sendBrandLocalizationFailure("INVALID_BRAND_LOCALIZATION_RESPONSE", res)
    return
  }

  res.json(brand)
}
