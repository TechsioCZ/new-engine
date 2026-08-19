import type { GetServerSideProps } from "next"
import type { ReachableCheckoutStep } from "@/lib/routing/private-flows/medusa-transactional-flow-reader"
import { resolveCheckoutUiPage } from "@/lib/routing/private-flows/transactional-page.server"
import type { PublicPageProps } from "@/lib/routing/public-page"

type Props = PublicPageProps<Readonly<{ step: ReachableCheckoutStep }>>

export const getServerSideProps = (async (context) =>
  resolveCheckoutUiPage(context, {
    expectedRouteKey: "checkout",
  })) satisfies GetServerSideProps<Props>

export default function CheckoutRootPage() {
  return null
}
