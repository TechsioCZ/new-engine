import type { GetServerSideProps } from "next"
import { CheckoutPaymentReturnPanel } from "@/components/checkout/checkout-payment-return-panel"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import type { PaymentResultProjection } from "@/lib/routing/private-flows/medusa-transactional-flow-reader"
import {
  readExactPrivateQuery,
  resolvePrivateFlowPublicPage,
} from "@/lib/routing/private-flows/private-query"
import {
  readCartSessionToken,
  readPaymentResultToken,
} from "@/lib/routing/private-flows/request-cookies"
import { transactionalFlowReader } from "@/lib/routing/private-flows/transactional-page.server"
import { notFoundResult, type PublicPageProps } from "@/lib/routing/public-page"

type Props = PublicPageProps<PaymentResultProjection>

export const getServerSideProps = ((context) => {
  const privateQuery = readExactPrivateQuery(context.req.url, [])
  const cookieHeader =
    typeof context.req.headers.cookie === "string"
      ? context.req.headers.cookie
      : undefined
  const cartSessionToken = readCartSessionToken(cookieHeader)
  const resultToken = readPaymentResultToken(cookieHeader)
  if (!(privateQuery && cartSessionToken && resultToken)) {
    return notFoundResult(context)
  }
  return resolvePrivateFlowPublicPage(context, {
    expectedRouteKey: "checkout.checkoutResult",
    loadSource: (market) =>
      transactionalFlowReader.readPaymentResult(market, {
        cartSessionToken,
        resultToken,
      }),
  })
}) satisfies GetServerSideProps<Props>

export default function CheckoutResultPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="checkout" />
  }
  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 pt-600 pb-850 font-rubik lg:px-550 xl:px-700">
      <CheckoutPaymentReturnPanel paymentResult={page.value} />
    </main>
  )
}
