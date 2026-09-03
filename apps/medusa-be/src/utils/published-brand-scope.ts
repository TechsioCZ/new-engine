import type { MedusaContainer } from "@medusajs/framework/types"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import {
  type CatalogMarket,
  readExactCatalogTranslations,
  resolveCatalogLocaleMarket,
} from "./catalog-translation"
import { PRODUCT_CONTENT_SOURCE_LOCALE } from "./product-content"

const MAX_PUBLISHED_BRAND_ASSIGNMENTS = 10_000

export type PublishedBrandScopeResult =
  | Readonly<{ kind: "source" }>
  | Readonly<{
      brandIds: readonly string[]
      kind: "published"
      market: CatalogMarket
      salesChannelId: string
    }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>
  | Readonly<{ kind: "unavailable" }>

const resolveExactSalesChannelId = (value: unknown): string | null => {
  const values = Array.isArray(value) ? value : []
  const ids = [
    ...new Set(
      values.filter(
        (candidate): candidate is string =>
          typeof candidate === "string" && candidate.trim().length > 0
      )
    ),
  ]
  return ids.length === 1 ? (ids[0] ?? null) : null
}

const resolveMarketForLocale = (locale: string) =>
  resolveCatalogLocaleMarket(locale)

export const readPublishedBrandScope = async ({
  container,
  locale,
  salesChannelIds,
}: {
  container: Pick<MedusaContainer, "resolve">
  locale?: string
  salesChannelIds: unknown
}): Promise<PublishedBrandScopeResult> => {
  if (!locale || locale === PRODUCT_CONTENT_SOURCE_LOCALE) {
    return { kind: "source" }
  }

  const market = resolveMarketForLocale(locale)
  const salesChannelId = resolveExactSalesChannelId(salesChannelIds)
  if (!(market && salesChannelId)) {
    return {
      causeCode: "INVALID_BRAND_PUBLICATION_SCOPE",
      kind: "invalid-response",
    }
  }

  let records: Awaited<
    ReturnType<
      StorefrontUrlAssignmentModuleService["listStorefrontUrlAssignments"]
    >
  >
  try {
    const service = container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
    records = await service.listStorefrontUrlAssignments(
      {
        entity_kind: "brand",
        market_code: market,
        publication_status: "published",
        sales_channel_id: salesChannelId,
      },
      {
        select: [
          "entity_id",
          "entity_kind",
          "market_code",
          "publication_status",
          "sales_channel_id",
        ],
        take: MAX_PUBLISHED_BRAND_ASSIGNMENTS + 1,
      }
    )
  } catch {
    return { kind: "unavailable" }
  }

  if (records.length > MAX_PUBLISHED_BRAND_ASSIGNMENTS) {
    return {
      causeCode: "BRAND_PUBLICATION_SCOPE_TOO_LARGE",
      kind: "invalid-response",
    }
  }

  const brandIds = new Set<string>()
  for (const record of records) {
    if (
      record.entity_kind !== "brand" ||
      record.market_code !== market ||
      record.publication_status !== "published" ||
      record.sales_channel_id !== salesChannelId ||
      brandIds.has(record.entity_id)
    ) {
      return {
        causeCode: "INVALID_BRAND_PUBLICATION_ASSIGNMENT",
        kind: "invalid-response",
      }
    }
    brandIds.add(record.entity_id)
  }

  return {
    brandIds: [...brandIds],
    kind: "published",
    market,
    salesChannelId,
  }
}

export const hasValidLocalizedBrandResponse = (
  brands: readonly unknown[],
  allowedIds: readonly string[],
  selectedFields: unknown
) => {
  const allowed = new Set(allowedIds)
  const seen = new Set<string>()
  const fields = Array.isArray(selectedFields)
    ? new Set(
        selectedFields.filter(
          (field): field is string => typeof field === "string"
        )
      )
    : null
  const includesId = !fields || fields.has("id")
  const includesTitle = !fields || fields.has("title")
  return brands.every((brand) => {
    if (!(brand && typeof brand === "object")) {
      return false
    }
    const id = Reflect.get(brand, "id")
    const title = Reflect.get(brand, "title")
    if (
      (includesId &&
        (typeof id !== "string" || !allowed.has(id) || seen.has(id))) ||
      (includesTitle &&
        (typeof title !== "string" || title.trim().length === 0))
    ) {
      return false
    }
    if (includesId && typeof id === "string") {
      seen.add(id)
    }
    return true
  })
}

export const readPublishedBrandLocalization = async ({
  brandIds,
  container,
  market,
}: {
  brandIds: readonly string[]
  container: Pick<MedusaContainer, "resolve">
  market: CatalogMarket
}): Promise<
  Readonly<{ kind: "ready" }> | Readonly<{ code: string; kind: "failure" }>
> => {
  const translations = await readExactCatalogTranslations({
    container,
    entityIds: brandIds,
    entityKind: "brand",
    market,
  })
  if (translations.kind === "unavailable") {
    return { code: "BRAND_TRANSLATION_UNAVAILABLE", kind: "failure" }
  }
  if (translations.kind === "invalid-response") {
    return { code: translations.causeCode, kind: "failure" }
  }
  if (translations.missingEntityIds.length > 0) {
    return { code: "MISSING_BRAND_TRANSLATION", kind: "failure" }
  }
  return { kind: "ready" }
}

export const sendPublishedBrandScopeFailure = (
  result: Exclude<PublishedBrandScopeResult, { kind: "published" | "source" }>,
  res: { status: (status: number) => { json: (body: unknown) => unknown } }
) =>
  res.status(503).json({
    code:
      result.kind === "invalid-response"
        ? result.causeCode
        : "BRAND_PUBLICATION_SCOPE_UNAVAILABLE",
    message: "Brand publication scope is unavailable.",
  })

export const sendBrandLocalizationFailure = (
  code: string,
  res: { status: (status: number) => { json: (body: unknown) => unknown } }
) =>
  res.status(503).json({
    code,
    message: "Brand localization is unavailable.",
  })
