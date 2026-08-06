import type { GetServerSideProps } from "next"
import { ProductReviewTokenPage } from "@/components/reviews/product-review-token-page"
import { type FlowPageProps, resolveFlowPage } from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type Props = FlowPageProps<{ token: string; productId?: string }>
export const getServerSideProps: GetServerSideProps<Props> = (context) => {
  const token = context.params?.token
  const productId = Array.isArray(context.query.product_id)
    ? context.query.product_id[0]
    : context.query.product_id
  return typeof token === "string"
    ? resolveFlowPage(context, async () => ({
        type: "found",
        value: { token, productId },
      }))
    : Promise.resolve({ notFound: true })
}
export default function ReviewPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return source ? (
    <ProductReviewTokenPage productId={source.productId} token={source.token} />
  ) : null
}
