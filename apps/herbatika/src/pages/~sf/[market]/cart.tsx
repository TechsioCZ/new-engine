import type { GetServerSideProps } from "next"
import { CheckoutFlow } from "@/components/checkout-flow"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
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
    return <LocalizedPageError status={page.status} surface="cart" />
  }
  return <CheckoutFlow activeStep="kosik" />
}
