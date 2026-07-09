import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import {
  STOREFRONT_TEXT_LOCALES,
  type StorefrontTextLocale,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import type { StoreGetStorefrontTextsSchemaType } from "./validators"

type StorefrontTextRecord = {
  key: string
  value: string
}

const resolveLocale = (locale?: string): StorefrontTextLocale => {
  if (!locale) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Field 'locale' is required"
    )
  }

  if (STOREFRONT_TEXT_LOCALES.includes(locale as StorefrontTextLocale)) {
    return locale as StorefrontTextLocale
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
  const service = req.scope.resolve<StorefrontTextModuleService>(
    STOREFRONT_TEXT_MODULE
  )
  const storefrontTexts = (await service.listStorefrontTexts({
    locale,
    market,
    ...(namespace ? { namespace } : {}),
    status: "active",
  })) as StorefrontTextRecord[]
  const messages = Object.fromEntries(
    storefrontTexts.map((item) => [item.key, item.value])
  )

  res.json({
    locale,
    market,
    messages,
  })
}
