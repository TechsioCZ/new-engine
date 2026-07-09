import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import type {
  AdminGetStorefrontTextsSchemaType,
  AdminUpdateStorefrontTextSchemaType,
} from "./validators"

type StorefrontTextRecord = AdminUpdateStorefrontTextSchemaType & {
  country: string
  created_at?: Date | string
  deleted_at?: Date | null | string
  description?: null | string
  domain: string
  id: string
  key: string
  locale: string
  market: string
  namespace: string
  updated_at?: Date | string
  value: string
}

const compareStorefrontTextRecords = (
  first: StorefrontTextRecord,
  second: StorefrontTextRecord
) =>
  first.namespace.localeCompare(second.namespace) ||
  first.key.localeCompare(second.key) ||
  first.market.localeCompare(second.market) ||
  first.locale.localeCompare(second.locale)

const toStringValue = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : ""

const matchesSearch = (record: StorefrontTextRecord, query?: string) => {
  const normalizedQuery = query?.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    record.description,
    record.key,
    record.locale,
    record.market,
    record.namespace,
    record.value,
  ].some((value) => toStringValue(value).includes(normalizedQuery))
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetStorefrontTextsSchemaType>,
  res: MedusaResponse
) {
  const { limit, offset, q, ...baseFilters } = req.validatedQuery
  const filters = Object.fromEntries(
    Object.entries(baseFilters).filter(([, value]) => value !== undefined)
  )
  const service = req.scope.resolve<StorefrontTextModuleService>(
    STOREFRONT_TEXT_MODULE
  )
  const records = (await service.listStorefrontTexts(
    filters
  )) as StorefrontTextRecord[]
  const filteredRecords = records
    .filter((record) => matchesSearch(record, q))
    .sort(compareStorefrontTextRecords)
  const storefrontTexts = filteredRecords.slice(offset, offset + limit)

  res.json({
    count: filteredRecords.length,
    limit,
    offset,
    storefront_texts: storefrontTexts,
  })
}
