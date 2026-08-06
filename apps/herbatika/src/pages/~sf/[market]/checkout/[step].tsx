import type { GetServerSideProps } from "next"
import { CheckoutFlow } from "@/components/checkout-flow"
import {
  type FlowPageProps,
  resolveFlowPage,
  resolveMarketParam,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import { buildCheckoutUrl } from "@/lib/url/builder"
import { getSegment } from "@/lib/url/segments"

type Step = "kosik" | "doprava-platba" | "udaje" | "suhrn"
type Props = FlowPageProps<{ step: Step }>
export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const market = resolveMarketParam(context)
  const step = context.params?.step
  if (!(market && typeof step === "string")) {
    return { notFound: true }
  }
  const entries = [
    ["checkout.contact", "udaje"],
    ["checkout.shipping", "doprava-platba"],
    ["checkout.payment", "doprava-platba"],
    ["checkout.review", "suhrn"],
  ] as const
  const mapped = entries.find(
    ([key]) => getSegment(market, key) === step.toLowerCase()
  )?.[1]
  if (!mapped) {
    return {
      redirect: {
        destination: buildCheckoutUrl(market, "checkout.contact"),
        permanent: false,
      },
    }
  }
  return await resolveFlowPage(context, async () => ({
    type: "found",
    value: { step: mapped },
  }))
}
export default function CheckoutStep({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return source ? <CheckoutFlow activeStep={source.step} /> : null
}
