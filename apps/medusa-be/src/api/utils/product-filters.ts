import {
  isPresent,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

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
type RemoteQueryLike = (query: unknown) => Promise<Record<string, unknown>[]>

const isRecord = (value: unknown): value is ProductFilters =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [value]

export const normalizeProductSalesChannelFilter = async (
  query: QueryLike,
  remoteQuery: RemoteQueryLike,
  filterableFields: ProductFilters
): Promise<ProductFilters> => {
  let filters = { ...filterableFields }

  if (isPresent(filters.price_list_id)) {
    const priceListIds = asArray(filters.price_list_id)
    const { price_list_id: _priceListId, ...filtersWithoutPriceListId } =
      filters
    filters = filtersWithoutPriceListId

    const queryObject = remoteQueryObjectFromString({
      entryPoint: "price",
      fields: ["price_set.variant.id"],
      variables: {
        filters: { price_list_id: priceListIds },
      },
    })

    const prices = await remoteQuery(queryObject)
    const variantIds = prices.flatMap((price) => {
      const priceSet = price.price_set
      if (!isRecord(priceSet)) {
        return []
      }

      const variant = priceSet.variant
      if (!isRecord(variant) || typeof variant.id !== "string") {
        return []
      }

      return [variant.id]
    })

    filters.variants = {
      ...(isRecord(filters.variants) ? filters.variants : {}),
      id: Array.from(new Set(variantIds)),
    }
  }

  if (!isPresent(filters.sales_channel_id)) {
    return filters
  }

  const salesChannelIds = asArray(filters.sales_channel_id)
  const { sales_channel_id: _salesChannelId, ...filtersWithoutSalesChannelId } =
    filters
  filters = filtersWithoutSalesChannelId

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
    const { sales_channels: _salesChannels, ...filtersWithoutSalesChannels } =
      filters
    filters = filtersWithoutSalesChannels
  }

  return filters
}
