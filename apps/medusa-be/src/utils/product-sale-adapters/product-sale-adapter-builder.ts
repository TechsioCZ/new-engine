import type { AbstractProductSaleAdapter } from "./abstract-product-sale-adapter"
import { DiscountProductSaleAdapter } from "./discount-product-sale-adapter"
import type {
  ProductSaleAdapterMatcher,
  ProductSaleAdapterName,
  ProductSaleAdapterSelection,
  ProductSaleEligibility,
  ProductSaleFetchGraphConfig,
  ProductSaleFetchQuery,
  ProductSaleFetchResult,
} from "./types"

export class ProductSaleAdapterBuilder {
  private readonly adaptersByName = new Map<
    ProductSaleAdapterName,
    AbstractProductSaleAdapter
  >()

  constructor(adapters: AbstractProductSaleAdapter[] = []) {
    for (const adapter of adapters) {
      this.register(adapter)
    }
  }

  static withDefaultAdapters(): ProductSaleAdapterBuilder {
    return new ProductSaleAdapterBuilder([new DiscountProductSaleAdapter()])
  }

  register(adapter: AbstractProductSaleAdapter): this {
    this.adaptersByName.set(adapter.name, adapter)
    return this
  }

  async fetchProducts(options: {
    eligibility?: ProductSaleEligibility
    graph: ProductSaleFetchGraphConfig
    query: ProductSaleFetchQuery
    selection: ProductSaleAdapterSelection
  }): Promise<ProductSaleFetchResult> {
    const matcher = this.build(options.selection)
    const result = await options.query.graph(options.graph)
    const context = options.eligibility
      ? { eligibility: options.eligibility }
      : undefined
    const data = result.data.flatMap((product) => {
      const saleAdapters = matcher.matchNames(product, context)

      return saleAdapters.length > 0
        ? [
            {
              ...product,
              sale_adapters: saleAdapters,
            },
          ]
        : []
    })

    const count =
      options.eligibility && result.metadata?.count !== undefined
        ? result.metadata.count
        : data.length

    return {
      ...result,
      data,
      metadata: result.metadata
        ? {
            ...result.metadata,
            count,
          }
        : {
            count,
          },
    }
  }

  build(
    selection: ProductSaleAdapterSelection | undefined
  ): ProductSaleAdapterMatcher {
    const adapters = this.resolveAdapters(selection)

    return {
      names: adapters.map((adapter) => adapter.name),
      enabled: adapters.length > 0,
      matches: (product, context) =>
        adapters.some((adapter) => adapter.matches(product, context)),
      matchNames: (product, context) =>
        adapters
          .filter((adapter) => adapter.matches(product, context))
          .map((adapter) => adapter.name),
    }
  }

  resolveNames(
    selection: ProductSaleAdapterSelection | undefined
  ): ProductSaleAdapterName[] {
    if (selection === true) {
      return Array.from(this.adaptersByName.keys())
    }

    if (!Array.isArray(selection)) {
      return []
    }

    return Array.from(new Set(selection)).filter((name) =>
      this.adaptersByName.has(name)
    )
  }

  private resolveAdapters(
    selection: ProductSaleAdapterSelection | undefined
  ): AbstractProductSaleAdapter[] {
    return this.resolveNames(selection)
      .map((name) => this.adaptersByName.get(name))
      .filter(
        (adapter): adapter is AbstractProductSaleAdapter =>
          adapter !== undefined
      )
  }
}
