import type { ProductContentValues } from "../../utils/product-content"

export type UpsertProductContentInput = ProductContentValues & {
  product_id: string
}

export type UpdateProductContentInput = {
  content: ProductContentValues
  description: null | string
  metadata: null | Record<string, unknown>
  product_id: string
}
