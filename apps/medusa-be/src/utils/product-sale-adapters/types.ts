export const ProductSaleAdapterName = {
  DISCOUNT: "discount",
} as const

export type ProductSaleAdapterName =
  (typeof ProductSaleAdapterName)[keyof typeof ProductSaleAdapterName]

export const PRODUCT_SALE_ADAPTER_NAMES = [
  ProductSaleAdapterName.DISCOUNT,
] as const

export type ProductSaleAdapterSelection = true | ProductSaleAdapterName[]

export type ProductSaleEligibility = {
  productIds?: Iterable<string>
}

export type ProductSaleAdapterContext = {
  eligibility?: ProductSaleEligibility
}

export type ProductSaleAdapterAlgorithm = (
  product: unknown,
  context?: ProductSaleAdapterContext
) => boolean

export type ProductSaleAdapterMatcher = {
  names: ProductSaleAdapterName[]
  enabled: boolean
  matches: (product: unknown, context?: ProductSaleAdapterContext) => boolean
  matchNames: (
    product: unknown,
    context?: ProductSaleAdapterContext
  ) => ProductSaleAdapterName[]
}

export type ProductSaleFetchGraphConfig = {
  context?: Record<string, unknown>
  entity: string
  fields: string[]
  filters?: Record<string, unknown>
  pagination?: Record<string, unknown>
}

export type ProductSaleFetchMetadata = {
  count?: number
} & Record<string, unknown>

export type ProductSaleFetchResult = {
  data: Record<string, unknown>[]
  metadata?: ProductSaleFetchMetadata
}

export type ProductSaleFetchQuery = {
  graph: (
    config: ProductSaleFetchGraphConfig
  ) => Promise<ProductSaleFetchResult>
}
