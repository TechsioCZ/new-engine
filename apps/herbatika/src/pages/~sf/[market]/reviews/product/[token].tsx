import type { GetServerSideProps } from "next"
import { ProductReviewTokenPage } from "@/components/reviews/product-review-token-page"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  exactOpaqueSegment,
  exactOptionalQueryValue,
} from "@/lib/routing/private-flows/opaque-values"
import {
  readExactPrivateQuery,
  resolvePrivateFlowPublicPage,
} from "@/lib/routing/private-flows/private-query"
import { loadReviewInvitationSource } from "@/lib/routing/private-flows/review-invitation-source.server"
import { notFoundResult, type PublicPageProps } from "@/lib/routing/public-page"

type ReviewValue = Readonly<{
  productId?: string
  token: string
}>

type Props = PublicPageProps<ReviewValue>

export const getServerSideProps = (async (context) => {
  const token = exactOpaqueSegment(context.params?.token)
  const privateQuery = readExactPrivateQuery(context.req.url, ["product_id"])
  const productId = exactOptionalQueryValue(
    privateQuery?.get("product_id") ?? undefined,
    256
  )
  if (!(token && privateQuery) || productId === null) {
    return notFoundResult(context)
  }
  const result = await resolvePrivateFlowPublicPage<ReviewValue>(context, {
    expectedRouteKey: "reviews.product",
    loadSource: async (market) =>
      loadReviewInvitationSource({
        market,
        productId: productId ?? undefined,
        token,
      }),
    suppressCanonicalization: true,
  })
  return result
}) satisfies GetServerSideProps<Props>

export default function ReviewTokenPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="review" />
  }
  return (
    <ProductReviewTokenPage
      productId={page.value.productId}
      token={page.value.token}
    />
  )
}
