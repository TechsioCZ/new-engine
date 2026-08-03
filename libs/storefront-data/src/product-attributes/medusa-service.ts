import type Medusa from "@medusajs/js-sdk"

import type {
  ProductAttribute,
  ProductAttributeListResponse,
  ProductAttributeService,
} from "./types"

export const MEDUSA_PRODUCT_ATTRIBUTES_PAGE_SIZE = 100

export type MedusaProductAttributesInput = {
  productId?: null | string
  enabled?: boolean
}

export type MedusaProductAttributeServiceConfig = {
  productsPath?: string
  pageSize?: number
}

const resolvePageSize = (pageSize?: number) => {
  if (pageSize === undefined) {
    return MEDUSA_PRODUCT_ATTRIBUTES_PAGE_SIZE
  }

  if (!(Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100)) {
    throw new Error("Product Attribute page size must be between 1 and 100.")
  }

  return pageSize
}

export function createMedusaProductAttributeService(
  sdk: Medusa,
  config?: MedusaProductAttributeServiceConfig
): ProductAttributeService<ProductAttribute, MedusaProductAttributesInput> {
  const productsPath = config?.productsPath ?? "/store/products"
  const pageSize = resolvePageSize(config?.pageSize)

  return {
    getProductAttributes: async (params, signal?: AbortSignal) => {
      if (!params.productId) {
        throw new Error("Product id is required for Product Attributes.")
      }

      const productAttributes: ProductAttribute[] = []
      let offset = 0

      while (true) {
        const response = await sdk.client.fetch<ProductAttributeListResponse>(
          `${productsPath}/${encodeURIComponent(params.productId)}/product-attributes`,
          {
            query: {
              limit: pageSize,
              offset,
            },
            ...(signal === undefined ? {} : { signal }),
          }
        )

        productAttributes.push(...response.product_attributes)

        if (
          response.product_attributes.length === 0 ||
          productAttributes.length >= response.count
        ) {
          return productAttributes
        }

        offset += response.product_attributes.length
      }
    },
  }
}
