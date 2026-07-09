import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import type { StorefrontTextRecord } from "../../../modules/storefront-text/models/storefront-text"
import {
  getStorefrontTextDefaultMessages,
  STOREFRONT_TEXT_DEFINITIONS,
  STOREFRONT_TEXT_LOCALES,
  type StorefrontTextKey,
  type StorefrontTextLocale,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import type { StoreGetStorefrontTextsSchemaType } from "./validators"

const STOREFRONT_TEXT_LOCALE_VALUES = new Set<string>(STOREFRONT_TEXT_LOCALES)
const STOREFRONT_TEXT_KEY_VALUES = new Set<string>(
  STOREFRONT_TEXT_DEFINITIONS.map((definition) => definition.key)
)

const isStorefrontTextLocale = (
  locale: string
): locale is StorefrontTextLocale => STOREFRONT_TEXT_LOCALE_VALUES.has(locale)

const isStorefrontTextKey = (key: string): key is StorefrontTextKey =>
  STOREFRONT_TEXT_KEY_VALUES.has(key)

const hasStorefrontTextMessage = (
  item: StorefrontTextRecord
): item is StorefrontTextRecord & { key: StorefrontTextKey; value: string } =>
  typeof item.key === "string" &&
  isStorefrontTextKey(item.key) &&
  typeof item.value === "string"

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
  const service = req.scope.resolve<StorefrontTextModuleService>(
    STOREFRONT_TEXT_MODULE
  )
  const storefrontTexts = await service.listStorefrontTexts({
    locale,
    market,
    ...(namespace ? { namespace } : {}),
    status: "active",
  })
  const messages = {
    ...getStorefrontTextDefaultMessages({ market, namespace }),
    ...Object.fromEntries(
      storefrontTexts
        .filter(hasStorefrontTextMessage)
        .map((item) => [item.key, item.value])
    ),
  }

  res.json({
    locale,
    market,
    messages,
  })
}
