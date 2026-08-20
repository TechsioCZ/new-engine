import type { HttpTypes } from "@medusajs/types"
import type { GetServerSideProps } from "next"
import { AccountOrderDetailItems } from "@/components/account/orders/account-order-detail-items"
import { AccountOrderDetailSummary } from "@/components/account/orders/account-order-detail-summary"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import {
  exactOpaqueSegment,
  exactOptionalQueryValue,
} from "@/lib/routing/private-flows/opaque-values"
import {
  readExactPrivateQuery,
  resolvePrivateFlowPublicPage,
} from "@/lib/routing/private-flows/private-query"
import { readCustomerToken } from "@/lib/routing/private-flows/request-cookies"
import { transactionalFlowReader } from "@/lib/routing/private-flows/transactional-page.server"
import { notFoundResult, type PublicPageProps } from "@/lib/routing/public-page"

type Props = PublicPageProps<Readonly<{ order: HttpTypes.StoreOrder }>>

export const getServerSideProps = (async (context) => {
  const orderId = exactOpaqueSegment(context.params?.publicOrderId, 256)
  const privateQuery = readExactPrivateQuery(context.req.url, ["ot"])
  const orderToken = exactOptionalQueryValue(
    privateQuery?.get("ot") ?? undefined
  )
  if (!(orderId && privateQuery) || orderToken === null) {
    return notFoundResult(context)
  }
  const result = await resolvePrivateFlowPublicPage(context, {
    expectedRouteKey: "checkout.confirmation",
    loadSource: (market) =>
      transactionalFlowReader.readOrderConfirmation(market, {
        customerToken: readCustomerToken(
          typeof context.req.headers.cookie === "string"
            ? context.req.headers.cookie
            : undefined
        ),
        orderId,
        ...(orderToken ? { orderToken } : {}),
      }),
    suppressCanonicalization: true,
  })
  return result
}) satisfies GetServerSideProps<Props>

export default function OrderConfirmationPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="order" />
  }
  return (
    <main className="mx-auto w-full max-w-max-w px-400 py-600 lg:px-550 xl:px-700">
      <div className="space-y-400">
        <AccountOrderDetailSummary
          customerEmail={page.value.order.email}
          order={page.value.order}
        />
        <AccountOrderDetailItems order={page.value.order} />
      </div>
    </main>
  )
}
