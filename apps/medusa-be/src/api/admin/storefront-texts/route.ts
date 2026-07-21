import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import { getPublishedStorefrontTextValue } from "../../../modules/storefront-text/catalog"
import type { StorefrontTextRecord } from "../../../modules/storefront-text/models/storefront-text"
import type {
  StorefrontTextLocale,
  StorefrontTextMarket,
  StorefrontTextNamespace,
  StorefrontTextStatus,
} from "../../../modules/storefront-text/configuration"
import {
  STOREFRONT_TEXT_DEFINITIONS,
  findStorefrontTextDefault,
  type StorefrontTextKey,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import { escapeLikePattern } from "../../../utils/sql"
import type { AdminGetStorefrontTextsSchemaType } from "./validators"

type StorefrontTextFilters = {
  $or?: StorefrontTextFilters[]
  default_value?: { $ilike: string }
  description?: { $ilike: string }
  key?: StorefrontTextKey[] | { $ilike: string }
  locale?: StorefrontTextLocale | { $ilike: string }
  market?: StorefrontTextMarket | { $ilike: string }
  namespace?: StorefrontTextNamespace | { $ilike: string }
  override_value?: null | { $ilike: string }
  status?: StorefrontTextStatus | { $ne: StorefrontTextStatus }
}

const SEARCH_FIELDS = [
  "description",
  "default_value",
  "key",
  "locale",
  "market",
  "namespace",
  "override_value",
] as const

const CURRENT_STOREFRONT_TEXT_KEYS = STOREFRONT_TEXT_DEFINITIONS.map(
  (definition) => definition.key
)

const buildEffectiveValueSearchFilters = (
  searchValue: string
): StorefrontTextFilters[] => [
  {
    override_value: { $ilike: searchValue },
    status: "active",
  },
  {
    $or: [{ status: { $ne: "active" } }, { override_value: null }],
    default_value: { $ilike: searchValue },
  },
]

const buildSearchFilters = (
  query: string | undefined,
  searchScope: AdminGetStorefrontTextsSchemaType["search_scope"]
): StorefrontTextFilters["$or"] => {
  const normalizedQuery = query?.trim()

  if (!normalizedQuery) {
    return
  }

  const searchValue = `%${escapeLikePattern(normalizedQuery)}%`

  if (searchScope === "value") {
    return buildEffectiveValueSearchFilters(searchValue)
  }

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
  search_scope: searchScope,
  status,
}: AdminGetStorefrontTextsSchemaType): StorefrontTextFilters => {
  const filters: StorefrontTextFilters = {
    key: CURRENT_STOREFRONT_TEXT_KEYS,
  }
  const searchFilters = buildSearchFilters(q, searchScope)

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

const serializeStorefrontText = (storefrontText: StorefrontTextRecord) => {
  const currentDefault = findStorefrontTextDefault(storefrontText)

  if (!currentDefault) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Storefront text "${storefrontText.key}" has no current default for market "${storefrontText.market}" and locale "${storefrontText.locale}"`
    )
  }

  return {
    ...storefrontText,
    default_value: currentDefault.value,
    effective_value: getPublishedStorefrontTextValue({
      defaultValue: currentDefault.value,
      locale: currentDefault.locale,
      record: storefrontText,
    }),
    has_override: storefrontText.override_value !== null,
  }
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
    storefront_texts: storefrontTexts.map(serializeStorefrontText) satisfies (StorefrontTextRecord & {
      effective_value: string
      has_override: boolean
    })[],
  })
}
