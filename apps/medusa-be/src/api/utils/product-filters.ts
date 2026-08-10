import type {
  FilterableProductProps,
  FilterableProductVariantProps,
  RemoteQueryFunction,
  RemoteQueryInput,
} from "@medusajs/framework/types"

type ProductIdFilter = NonNullable<FilterableProductProps["id"]>
type ProductQueryFilters = NonNullable<RemoteQueryInput<"product">["filters"]>

type ProductVariantFilters = NonNullable<FilterableProductProps["variants"]> &
  Pick<FilterableProductVariantProps, "id">

export type ProductFilters = Omit<
  ProductQueryFilters,
  "id" | "q" | "variants"
> &
  Pick<FilterableProductProps, "q"> & {
    id?: ProductIdFilter
    price_list_id?: string | string[] | undefined
    sales_channel_id?: string | string[] | undefined
    variants?: ProductVariantFilters
  }

const asArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? value : [value]

export const normalizeProductSalesChannelFilter = async (
  remoteQuery: RemoteQueryFunction,
  filterableFields: ProductFilters,
): Promise<ProductFilters> => {
  const {
    price_list_id: priceListId,
    sales_channel_id: salesChannelId,
    ...baseFilters
  } = filterableFields
  const { id: productId, ...filtersWithoutId } = baseFilters
  let filters: ProductFilters =
    productId === undefined
      ? filtersWithoutId
      : { ...filtersWithoutId, id: productId }

  if (priceListId !== undefined) {
    const { data: prices } = await remoteQuery.graph({
      entity: "price",
      fields: ["price_set.variant.id"],
      filters: { price_list_id: asArray(priceListId) },
    })
    const variantIds = prices.flatMap((price) =>
      price.price_set?.variant === null ||
      price.price_set?.variant === undefined
        ? []
        : [price.price_set.variant.id],
    )

    filters = {
      ...filters,
      variants: {
        ...filters.variants,
        id: [...new Set(variantIds)],
      },
    }
  }

  if (salesChannelId === undefined) {
    return filters
  }

  const filteredProductId = filters.id
  const linkFilters: NonNullable<
    RemoteQueryInput<"product_sales_channel">["filters"]
  > =
    filteredProductId === undefined
      ? { sales_channel_id: asArray(salesChannelId) }
      : {
          product_id: filteredProductId,
          sales_channel_id: asArray(salesChannelId),
        }
  const { data: links } = await remoteQuery.graph({
    entity: "product_sales_channel",
    fields: ["product_id"],
    filters: linkFilters,
  })
  return {
    ...filters,
    id: links.map((link) => link.product_id),
  }
}
