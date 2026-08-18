import type { GetServerSideProps } from "next"
import Head from "next/head"
import {
  type ProductPageRequest,
  rawQueryFromRequestTarget,
  resolveProductPageRequest,
} from "@/lib/routing/pages/product-page"
import type { ProductRouteRegistry } from "@/lib/routing/pages/product-route"
import {
  applySsrOutcome,
  type SsrOutcome,
  type SsrPageProps,
} from "@/lib/routing/pages/ssr-outcome"
import type { ProductRouteMedusaProduct } from "@/lib/storefront/product-route-source"
import { readProductRouteSourceFromMedusa } from "@/lib/storefront/product-route-source.server"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

type ProductPageView = Readonly<{
  canonicalUrl: string
  initialVariantId?: string
  productId: string
  productTitle: string
  publicSlug: string
}>

type ProductPageProps = SsrPageProps<ProductPageView>

const readRegistry = async (): Promise<
  SourceReadResult<ProductRouteRegistry>
> => {
  const runtime = await getUrlRegistryRuntime()
  if (!runtime.enabled) {
    return {
      kind: "invalid-response",
      causeCode: "URL_REGISTRY_RUNTIME_DISABLED",
    } as const
  }
  return { kind: "found", value: runtime.registry } as const
}

const singleHeader = (value: string | string[] | undefined) => value

const toPageView = (
  outcome: Awaited<
    ReturnType<typeof resolveProductPageRequest<ProductRouteMedusaProduct>>
  >
): SsrOutcome<ProductPageView> =>
  outcome.kind === "found"
    ? {
        kind: "found",
        value: {
          canonicalUrl: outcome.value.canonicalUrl,
          ...(outcome.value.initialVariantId === undefined
            ? {}
            : { initialVariantId: outcome.value.initialVariantId }),
          productId: outcome.value.product.id,
          productTitle: outcome.value.product.title,
          publicSlug: outcome.value.publicSlug,
        },
      }
    : outcome

export const getServerSideProps = (async ({ params, req, res }) => {
  const request: ProductPageRequest = {
    enabled: process.env.URL_PRODUCT_RESOLVER_ENABLED === "1",
    headers: {
      canonicalOrigin: singleHeader(req.headers["x-sf-canonical-origin"]),
      market: singleHeader(req.headers["x-sf-market"]),
      publicPath: singleHeader(req.headers["x-sf-public-path"]),
      routeKey: singleHeader(req.headers["x-sf-route-key"]),
    },
    marketParam: params?.market,
    rawQuery: rawQueryFromRequestTarget(req.url),
    slugParam: params?.slug,
  }
  const outcome = await resolveProductPageRequest(request, {
    readProductById: readProductRouteSourceFromMedusa,
    readRegistry,
  })

  if (res.headersSent) {
    throw new Error("Product route resolved after response headers were sent")
  }
  res.setHeader("X-SF-Resolution-Phase", "pre-flush")
  return applySsrOutcome(res, toPageView(outcome))
}) satisfies GetServerSideProps<ProductPageProps>

export default function ProductPagesRoute({ page }: ProductPageProps) {
  if (page.kind === "error") {
    return (
      <main>
        <h1>Product unavailable</h1>
        <p>Status: {page.status}</p>
      </main>
    )
  }

  return (
    <>
      <Head>
        <title>{page.value.productTitle}</title>
        <link href={page.value.canonicalUrl} rel="canonical" />
      </Head>
      <main data-product-id={page.value.productId}>
        <h1>{page.value.productTitle}</h1>
        <p data-public-slug={page.value.publicSlug}>
          Stable product URL resolved.
        </p>
      </main>
    </>
  )
}
