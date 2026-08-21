import type { GetServerSideProps } from "next"
import { isMarketCode } from "@/lib/market/market-runtime-definitions"
import { resolveMarketRequestContext } from "@/lib/storefront/market-context"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

type StaticAliasResolverProps = Readonly<{ unavailable: boolean }>

const firstHeader = (value: string | readonly string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const noStore = (response: Parameters<GetServerSideProps>[0]["res"]) => {
  response.setHeader("Cache-Control", "private, no-store, max-age=0")
  response.setHeader("Pragma", "no-cache")
  response.setHeader("X-Robots-Tag", "noindex, nofollow")
}

const unavailable = (response: Parameters<GetServerSideProps>[0]["res"]) => {
  response.statusCode = 503
  return { props: { unavailable: true } satisfies StaticAliasResolverProps }
}

export const getServerSideProps: GetServerSideProps<
  StaticAliasResolverProps
> = async (context) => {
  noStore(context.res)
  const market = context.params?.market
  const segments = context.params?.segments
  if (
    typeof market !== "string" ||
    !isMarketCode(market) ||
    !Array.isArray(segments) ||
    segments.length === 0 ||
    context.req.headers["x-sf-route-key"] !== "url-registry.resolve"
  ) {
    return { notFound: true }
  }
  const trustedMarket = firstHeader(context.req.headers["x-sf-market"])
  const trustedCanonicalOrigin = firstHeader(
    context.req.headers["x-sf-canonical-origin"]
  )
  const marketContext = resolveMarketRequestContext({
    host: firstHeader(context.req.headers.host),
    trustedCanonicalOrigin,
    trustedMarket,
  })
  if (marketContext?.code !== market || !trustedCanonicalOrigin) {
    return { notFound: true }
  }

  let runtime: Awaited<ReturnType<typeof getUrlRegistryRuntime>>
  try {
    runtime = await getUrlRegistryRuntime()
  } catch {
    return unavailable(context.res)
  }
  if (!runtime.enabled) {
    return unavailable(context.res)
  }
  let resolution: Awaited<ReturnType<typeof runtime.registry.resolveStaticPath>>
  try {
    resolution = await runtime.registry.resolveStaticPath({
      market,
      pathSegments: segments,
    })
  } catch {
    return unavailable(context.res)
  }
  if (resolution.kind === "missing") {
    return { notFound: true }
  }
  if (
    resolution.kind !== "found" ||
    resolution.value.route.market !== market ||
    resolution.value.disposition !== "alias"
  ) {
    return unavailable(context.res)
  }

  const canonicalPath = `/${resolution.value.canonicalPathSegments
    .map(encodeURIComponent)
    .join("/")}`
  const query = context.req.url
    ? new URL(context.req.url, "http://internal.invalid").search
    : ""
  return {
    redirect: {
      destination: `${trustedCanonicalOrigin}${canonicalPath}${query}`,
      statusCode: 308,
    },
  }
}

const StaticAliasResolver = () => null

export default StaticAliasResolver
