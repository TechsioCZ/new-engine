import type { GetServerSideProps } from "next"
import { resolveMarketParam } from "@/lib/routing/public-page"
import { buildCheckoutUrl } from "@/lib/url/builder"
export const getServerSideProps: GetServerSideProps = (context) => {
  const market = resolveMarketParam(context)
  if (!market) {
    return Promise.resolve({ notFound: true })
  }
  return Promise.resolve({
    redirect: {
      destination: buildCheckoutUrl(market, "checkout.contact"),
      permanent: false,
    },
  })
}
export default function CheckoutIndex() {
  return null
}
