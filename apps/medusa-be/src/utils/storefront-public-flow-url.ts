import { MedusaError } from "@medusajs/framework/utils"
import {
  buildPublicFlowUrl,
  type PublicFlowRouteTarget,
  parsePublicFlowMarket,
} from "@techsio/storefront-i18n/core/public-flow-routes"

export const buildStorefrontPublicFlowUrl = ({
  marketCode,
  storefrontBaseUrl,
  target,
}: {
  marketCode: unknown
  storefrontBaseUrl: string
  target: PublicFlowRouteTarget
}): URL => {
  const market = parsePublicFlowMarket(marketCode)

  if (!market) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Unsupported storefront market for public URL generation."
    )
  }

  try {
    return buildPublicFlowUrl(target, market, storefrontBaseUrl)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Storefront public URL configuration is invalid."
    )
  }
}
