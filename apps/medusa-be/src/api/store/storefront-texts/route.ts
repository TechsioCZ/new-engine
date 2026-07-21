import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import {
  getPublishedStorefrontTextMessages,
} from "../../../modules/storefront-text/catalog"
import {
  isStorefrontTextLocale,
  isStorefrontTextMarketLocalePair,
  type StorefrontTextLocale,
} from "../../../modules/storefront-text/configuration"
import { getStorefrontTextDefaultMessages } from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import type { StoreGetStorefrontTextsSchemaType } from "./validators"

const resolveLocale = (locale?: string): StorefrontTextLocale => {
  if (!locale) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Field 'locale' is required"
    )
  }

  if (isStorefrontTextLocale(locale)) {
    return locale
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported storefront text locale "${locale}"`
  )
}

export async function GET(
  req: MedusaRequest<unknown, StoreGetStorefrontTextsSchemaType>,
  res: MedusaResponse
) {
  const { market, namespace } = req.validatedQuery
  const locale = resolveLocale(req.locale)

  if (!isStorefrontTextMarketLocalePair(market, locale)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Locale "${locale}" does not belong to market "${market}"`
    )
  }

  const service = req.scope.resolve<StorefrontTextModuleService>(
    STOREFRONT_TEXT_MODULE
  )
  const storefrontTexts = await service.listStorefrontTexts({
    locale,
    market,
    ...(namespace ? { namespace } : {}),
    status: "active",
  })
  const messages = getPublishedStorefrontTextMessages(
    getStorefrontTextDefaultMessages({ market, namespace }),
    storefrontTexts,
    locale
  )

  res.json({
    locale,
    market,
    messages,
  })
}
