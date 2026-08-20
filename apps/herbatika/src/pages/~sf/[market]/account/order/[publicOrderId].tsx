import type { GetServerSideProps } from "next"
import { AccountOrderDetail } from "@/components/account-order-detail"
import { AccountShell } from "@/components/account-shell"
import { resolveAccountPrivatePage } from "@/lib/routing/private-flows/account-page.server"
import { exactOpaqueSegment } from "@/lib/routing/private-flows/opaque-values"
import { readExactPrivateQuery } from "@/lib/routing/private-flows/private-query"
import { transactionalFlowReader } from "@/lib/routing/private-flows/transactional-page.server"
import { notFoundResult, type PublicPageProps } from "@/lib/routing/public-page"

type Props = PublicPageProps<Readonly<{ orderId: string }>>

export const getServerSideProps = (async (context) => {
  const orderId = exactOpaqueSegment(context.params?.publicOrderId, 256)
  const privateQuery = readExactPrivateQuery(context.req.url, [])
  if (!(orderId && privateQuery)) {
    return notFoundResult(context)
  }
  const result = await resolveAccountPrivatePage(context, {
    expectedRouteKey: "account.order",
    loadSource: async (market, session) => {
      const order = await transactionalFlowReader.readOrderConfirmation(
        market,
        {
          customerToken: session.token,
          orderId,
        }
      )
      return order.kind === "found"
        ? { kind: "found", value: { orderId: order.value.order.id } }
        : order
    },
    suppressCanonicalization: true,
  })
  return result
}) satisfies GetServerSideProps<Props>

export default function AccountOrderPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Order unavailable.</main>
  }
  return (
    <AccountShell>
      <AccountOrderDetail orderId={page.value.orderId} />
    </AccountShell>
  )
}
