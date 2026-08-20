import type { GetServerSideProps } from "next"
import Head from "next/head"
import type { M00Market } from "@/lib/routing/m00-proxy"
import {
  applySsrOutcome,
  type SsrOutcome,
  type SsrPageProps,
} from "@/lib/routing/pages/ssr-outcome"

type M00FoundValue = {
  market: M00Market
}

type M00PageProps = SsrPageProps<M00FoundValue>

const MARKETS = new Set<M00Market>(["sk", "cz", "hu", "ro"])

const singleParam = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : null

const singleHeader = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : null

const resolveProbeOutcome = (
  outcome: string | null,
  market: M00Market,
  canonicalOrigin: string
): SsrOutcome<M00FoundValue> => {
  switch (outcome) {
    case "current":
      return { kind: "found", value: { market } }
    case "alias":
      return {
        kind: "redirect",
        destination: `${canonicalOrigin}/__url-m00/current`,
        statusCode: 308,
      }
    case "gone":
      return { kind: "gone" }
    case "unavailable":
      return { kind: "unavailable" }
    default:
      return { kind: "not-found" }
  }
}

export const getServerSideProps = (async ({ params, req, res }) => {
  const marketParam = singleParam(params?.market)
  const outcome = singleParam(params?.outcome)
  const market =
    marketParam && MARKETS.has(marketParam as M00Market)
      ? (marketParam as M00Market)
      : null
  const binding = market
    ? (
        await import("@/lib/market/market-runtime.server")
      ).requireConfiguredMarketRoutingBinding(market)
    : null
  const hasTrustedContext =
    market !== null &&
    singleHeader(req.headers["x-sf-market"]) === market &&
    singleHeader(req.headers["x-sf-canonical-origin"]) ===
      binding?.canonicalOrigin &&
    singleHeader(req.headers["x-sf-route-key"]) === "m00.status" &&
    singleHeader(req.headers["x-sf-public-path"]) ===
      `/__url-m00/${outcome ?? ""}`

  if (
    process.env.URL_ARCHITECTURE_M00_ENABLED !== "1" ||
    !market ||
    !hasTrustedContext
  ) {
    return applySsrOutcome(res, { kind: "not-found" })
  }

  await Promise.resolve()
  if (res.headersSent) {
    throw new Error("M00 resolution started after response headers were sent")
  }

  res.setHeader("X-M00-Resolution-Phase", "pre-flush")
  res.setHeader("X-Robots-Tag", "noindex, nofollow")
  return applySsrOutcome(
    res,
    resolveProbeOutcome(outcome, market, binding.canonicalOrigin)
  )
}) satisfies GetServerSideProps<M00PageProps>

export default function M00StatusPage({ page }: M00PageProps) {
  const title =
    page.kind === "error" ? `URL architecture ${page.status}` : "M00 current"

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta content="noindex, nofollow" name="robots" />
      </Head>
      <main>
        <h1>{title}</h1>
        {page.kind === "found" ? (
          <p data-market={page.value.market}>Pages Router SSR is active.</p>
        ) : (
          <p>The requested URL is not available.</p>
        )}
      </main>
    </>
  )
}
