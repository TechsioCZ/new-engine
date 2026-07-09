import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import type { StorefrontTextRecord } from "../../../modules/storefront-text/models/storefront-text"
import type {
  StorefrontTextLocale,
  StorefrontTextMarket,
  StorefrontTextNamespace,
  StorefrontTextStatus,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import type { AdminGetStorefrontTextsSchemaType } from "./validators"

type StorefrontTextFilters = {
  $or?: Record<string, { $ilike: string }>[]
  locale?: StorefrontTextLocale
  market?: StorefrontTextMarket
  namespace?: StorefrontTextNamespace
  status?: StorefrontTextStatus
}

const SEARCH_FIELDS = [
  "description",
  "key",
  "locale",
  "market",
  "namespace",
  "value",
] as const

const escapeLikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`)

const buildSearchFilters = (query?: string): StorefrontTextFilters["$or"] => {
  const normalizedQuery = query?.trim()

  if (!normalizedQuery) {
    return
  }

  const searchValue = `%${escapeLikePattern(normalizedQuery)}%`

  return SEARCH_FIELDS.map((field) => ({
    [field]: {
      $ilike: searchValue,
    },
  }))
}

const buildStorefrontTextFilters = ({
  locale,
  market,
  namespace,
  q,
  status,
}: AdminGetStorefrontTextsSchemaType): StorefrontTextFilters => {
  const filters: StorefrontTextFilters = {}
  const searchFilters = buildSearchFilters(q)

  if (locale) {
    filters.locale = locale
  }

  if (market) {
    filters.market = market
  }

  if (namespace) {
    filters.namespace = namespace
  }

  if (status) {
    filters.status = status
  }

  if (searchFilters) {
    filters.$or = searchFilters
  }

  return filters
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetStorefrontTextsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset } = req.validatedQuery
  const filters = buildStorefrontTextFilters(req.validatedQuery)
  const service = req.scope.resolve<StorefrontTextModuleService>(
    STOREFRONT_TEXT_MODULE
  )
  const [storefrontTexts, count] = await service.listAndCountStorefrontTexts(
    filters,
    {
      order: {
        namespace: "ASC",
        key: "ASC",
        market: "ASC",
        locale: "ASC",
      },
      skip: offset,
      take: limit,
    }
  )

  res.json({
    count,
    limit,
    offset,
    storefront_texts: storefrontTexts satisfies StorefrontTextRecord[],
  })
}
