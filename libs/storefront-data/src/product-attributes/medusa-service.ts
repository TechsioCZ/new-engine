import type Medusa from "@medusajs/js-sdk"

import type {
  ProductAttribute,
  ProductAttributeListResponse,
  ProductAttributeService,
} from "./types"

export const MEDUSA_PRODUCT_ATTRIBUTES_PAGE_SIZE = 100

const MAX_PRODUCT_ATTRIBUTE_PAGES = 1000

class ProductAttributePaginationError extends Error {
  readonly code = "PRODUCT_ATTRIBUTE_PAGINATION_LIMIT_EXCEEDED"
  readonly productId: string

  constructor(productId: string) {
    super("Product Attribute pagination exceeded the request limit.")
    this.name = "ProductAttributePaginationError"
    this.productId = productId
  }
}

export interface MedusaProductAttributesInput {
  productId?: null | string
  enabled?: boolean
}

export interface MedusaProductAttributeServiceConfig {
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

export const createMedusaProductAttributeService = (
  sdk: Medusa,
  config?: MedusaProductAttributeServiceConfig,
): ProductAttributeService<ProductAttribute, MedusaProductAttributesInput> => {
  const productsPath = config?.productsPath ?? "/store/products"
  const pageSize = resolvePageSize(config?.pageSize)

  const getProductAttributesPage = async (
    productId: string,
    offset: number,
    signal?: AbortSignal,
  ): Promise<ProductAttributeListResponse> =>
    await sdk.client.fetch<ProductAttributeListResponse>(
      `${productsPath}/${encodeURIComponent(productId)}/product-attributes`,
      {
        query: {
          limit: pageSize,
          offset,
        },
        ...(signal === undefined ? {} : { signal }),
      },
    )

  const getProductAttributes = async (
    params: MedusaProductAttributesInput,
    signal?: AbortSignal,
  ): Promise<ProductAttribute[]> => {
    const { productId } = params
    if (
      productId === undefined ||
      productId === null ||
      productId.length === 0
    ) {
      throw new Error("Product id is required for Product Attributes.")
    }

    const collectPages = async (
      offset: number,
      collected: ProductAttribute[],
      pageCount: number,
    ): Promise<ProductAttribute[]> => {
      if (pageCount >= MAX_PRODUCT_ATTRIBUTE_PAGES) {
        throw new ProductAttributePaginationError(productId)
      }

      const response = await getProductAttributesPage(productId, offset, signal)
      const nextAttributes = [...collected, ...response.product_attributes]

      if (
        response.product_attributes.length === 0 ||
        nextAttributes.length >= response.count
      ) {
        return nextAttributes
      }

      return await collectPages(
        offset + response.product_attributes.length,
        nextAttributes,
        pageCount + 1,
      )
    }

    return await collectPages(0, [], 0)
  }

  return { getProductAttributes }
}
