import type { AdminProduct } from "@medusajs/framework/types"
import type { ProductContentSectionHtml } from "./product-content-sections"
import { sdk } from "./sdk"

export type AdminProductContent = {
  composition: string
  id: null | string
  other: string
  product_id: string
  usage: string
  warning: string
}

export type AdminProductContentResponse = {
  product_content: AdminProductContent
}

export type AdminUpdateProductContentResponse = AdminProductContentResponse & {
  product: AdminProduct
}

export const productContentQueryKeys = {
  detail: (productId: string) => ["product-content", productId] as const,
}

export const getAdminProductContent = (productId: string) =>
  sdk.client.fetch<AdminProductContentResponse>(
    `/admin/products/${productId}/product-content`
  )

export const updateAdminProductContent = ({
  productId,
  sectionsHtml,
}: {
  productId: string
  sectionsHtml: ProductContentSectionHtml
}) =>
  sdk.client.fetch<AdminUpdateProductContentResponse>(
    `/admin/products/${productId}/product-content`,
    {
      body: sectionsHtml,
      method: "POST",
    }
  )
