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

export const metadata = {
  title: "Napísať recenziu | Herbatica",
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
