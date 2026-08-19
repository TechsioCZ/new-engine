import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ProductReviewTokenPage } from "@/components/reviews/product-review-token-page"

type ProductReviewTokenRouteProps = {
  params: Promise<{
    token: string
  }>
  searchParams: Promise<{
    product_id?: string | string[]
  }>
}

const resolveSearchParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

export async function generateMetadata(): Promise<Metadata> {
  const tCatalog = await getTranslations("catalog")

  return {
    title: tCatalog("reviews.token.metadata_title"),
  }
}

export default async function ProductReviewTokenRoute({
  params,
  searchParams,
}: ProductReviewTokenRouteProps) {
  const [{ token }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])

  return (
    <ProductReviewTokenPage
      productId={resolveSearchParam(resolvedSearchParams.product_id)}
      token={token}
    />
  )
}
