import type { Product } from "@/components/product-detail/product-detail.types"
import { PRODUCT_DETAIL_FIELDS } from "@/lib/storefront/product-query-config"

type BuildProductDetailQueryInput = Readonly<{
  handle: string
  initialProduct?: Product
}>

export const buildProductDetailQuery = ({
  handle,
  initialProduct,
}: BuildProductDetailQueryInput) => ({
  input: {
    handle,
    fields: PRODUCT_DETAIL_FIELDS,
    ...(initialProduct ? { enabled: false } : {}),
  },
})

export const resolveProductDetailProduct = (
  initialProduct: Product | undefined,
  queriedProduct: Product | null
): Product | null => initialProduct ?? queriedProduct

export const resolveInitialProductVariantId = (
  variants: Product["variants"] | undefined,
  initialVariantId: string | undefined
): string | null => {
  const productVariants = variants ?? []
  return productVariants.some((variant) => variant.id === initialVariantId)
    ? (initialVariantId ?? null)
    : (productVariants[0]?.id ?? null)
}
