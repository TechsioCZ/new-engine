import type { GetServerSideProps } from "next"
import { ProductReviewTokenPage } from "@/components/reviews/product-review-token-page"
import {
  exactOpaqueSegment,
  exactOptionalQueryValue,
} from "@/lib/routing/private-flows/opaque-values"
import {
  readExactPrivateQuery,
  resolvePrivateFlowPublicPage,
} from "@/lib/routing/private-flows/private-query"
import { transactionalFlowReader } from "@/lib/routing/private-flows/transactional-page.server"
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
    loadSource: async (market) => {
      const invitation = await transactionalFlowReader.readReviewInvitation(
        market,
        token
      )
      if (invitation.kind !== "found") {
        return invitation
      }
      if (productId && productId !== invitation.value.productId) {
        return { kind: "missing" }
      }
      return {
        kind: "found",
        value: { productId: invitation.value.productId, token },
      }
    },
    suppressCanonicalization: true,
  })
  return result
}) satisfies GetServerSideProps<Props>

export default function ReviewTokenPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Review unavailable.</main>
  }
  return (
    <ProductReviewTokenPage
      productId={page.value.productId}
      token={page.value.token}
    />
  )
}
