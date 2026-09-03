import type { GetServerSideProps } from "next"
import {
  type CheckoutUiPageValue,
  resolveCheckoutUiPage,
} from "@/lib/routing/private-flows/transactional-page.server"
import type { PublicPageProps } from "@/lib/routing/public-page"

type Props = PublicPageProps<CheckoutUiPageValue>

export const getServerSideProps = (async (context) =>
  resolveCheckoutUiPage(context, {
    expectedRouteKey: "checkout",
  })) satisfies GetServerSideProps<Props>

export default function CheckoutRootPage() {
  return null
}
