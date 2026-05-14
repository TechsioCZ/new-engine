import { isPresent } from "@medusajs/framework/utils"

type ProductFilters = Record<string, unknown>
type QueryLike = {
  graph: (config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{
    data?: Record<string, unknown>[]
  }>
}

const isRecord = (value: unknown): value is ProductFilters =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [value]

export const normalizeProductSalesChannelFilter = async (
  query: QueryLike,
  filterableFields: ProductFilters
): Promise<ProductFilters> => {
  const filters = { ...filterableFields }

  if (!isPresent(filters.sales_channel_id)) {
    return filters
  }

  const salesChannelIds = asArray(filters.sales_channel_id)
  delete filters.sales_channel_id

  const linkFilters: ProductFilters = {
    sales_channel_id: salesChannelIds,
  }

  if (isPresent(filters.id)) {
    linkFilters.product_id = filters.id
  }

  const { data: links = [] } = await query.graph({
    entity: "product_sales_channel",
    fields: ["product_id"],
    filters: linkFilters,
  })

  filters.id = links
    .map((link) => link.product_id)
    .filter((id): id is string => typeof id === "string")

  if (isRecord(filters.sales_channels)) {
    delete filters.sales_channels
  }

  return filters
}
