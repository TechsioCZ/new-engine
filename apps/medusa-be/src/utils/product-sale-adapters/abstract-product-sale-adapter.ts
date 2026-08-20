import type {
  ProductSaleAdapterAlgorithm,
  ProductSaleAdapterContext,
  ProductSaleAdapterName,
} from "./types"

export abstract class AbstractProductSaleAdapter {
  abstract readonly name: ProductSaleAdapterName
  abstract readonly algo: ProductSaleAdapterAlgorithm

  matches(product: unknown, context?: ProductSaleAdapterContext): boolean {
    return this.algo(product, context)
  }
}
