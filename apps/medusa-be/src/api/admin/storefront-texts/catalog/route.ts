import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../../modules/storefront-text"
import {
  getPublishedStorefrontTextMessages,
  nestStorefrontTextMessages,
  STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
} from "../../../../modules/storefront-text/catalog"
import {
  getStorefrontTextMarketConfiguration,
} from "../../../../modules/storefront-text/configuration"
import { getStorefrontTextDefaultMessages } from "../../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../../modules/storefront-text/service"
import { importStorefrontTextCatalogWorkflow } from "../../../../workflows/storefront-text/workflows/import-storefront-text-catalog"
import type {
  AdminGetStorefrontTextCatalogSchemaType,
  AdminImportStorefrontTextCatalogSchemaType,
} from "../validators"

const requireMarketConfiguration = (
  market: AdminGetStorefrontTextCatalogSchemaType["market"]
) => {
  const configuration = getStorefrontTextMarketConfiguration(market)
  if (!configuration) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported storefront text market "${market}"`
    )
  }

  return configuration
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetStorefrontTextCatalogSchemaType>,
  res: MedusaResponse
) {
  const { market } = req.validatedQuery
  const configuration = requireMarketConfiguration(market)
  const service = req.scope.resolve<StorefrontTextModuleService>(
    STOREFRONT_TEXT_MODULE
  )
  const records = await service.listStorefrontTexts({
    locale: configuration.locale,
    market,
  })
  const defaultMessages = getStorefrontTextDefaultMessages({ market })
  const messages = getPublishedStorefrontTextMessages(
    defaultMessages,
    records,
    configuration.locale
  )

  res.json({
    locale: configuration.locale,
    market,
    messages: nestStorefrontTextMessages(messages),
    schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
  })
}

export async function POST(
  req: MedusaRequest<AdminImportStorefrontTextCatalogSchemaType>,
  res: MedusaResponse
) {
  const { catalog, market } = req.validatedBody
  const configuration = requireMarketConfiguration(market)

  const { result } = await importStorefrontTextCatalogWorkflow(req.scope).run({
    input: {
      catalog,
      market,
    },
  })

  res.json({
    locale: configuration.locale,
    market,
    result,
  })
}
