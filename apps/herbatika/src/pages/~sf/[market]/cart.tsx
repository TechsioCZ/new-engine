import type { GetServerSideProps } from "next"
import { CheckoutFlow } from "@/components/checkout-flow"
import {
  foundSource,
  type PublicPageProps,
  resolveFlowPublicPage,
} from "@/lib/routing/public-page"

type Props = PublicPageProps<null>

export const getServerSideProps = (async (context) =>
  resolveFlowPublicPage(context, {
    expectedRouteKey: "cart",
    loadSource: async () => foundSource(null),
  })) satisfies GetServerSideProps<Props>

export default function CartPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Cart unavailable.</main>
  }
  return <CheckoutFlow activeStep="kosik" />
}
