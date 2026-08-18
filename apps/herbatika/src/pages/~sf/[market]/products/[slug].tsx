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
import { buildProductSeo, serializeProductJsonLd } from "@/lib/seo/product"
import type { ProductRouteMedusaProduct } from "@/lib/storefront/product-route-source"
import { readProductRouteSourceFromMedusa } from "@/lib/storefront/product-route-source.server"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

type ProductPageView = Readonly<{
  canonicalUrl: string
  description: string | null
  images: readonly string[]
  initialVariantId?: string
  jsonLd: string
  productId: string
  publicSlug: string
  title: string
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
): SsrOutcome<ProductPageView> => {
  if (outcome.kind !== "found") {
    return outcome
  }

  const seo = buildProductSeo({
    canonicalUrl: outcome.value.canonicalUrl,
    initialVariantId: outcome.value.initialVariantId,
    product: outcome.value.product,
  })

  return {
    kind: "found",
    value: {
      canonicalUrl: seo.canonicalUrl,
      description: seo.description,
      images: seo.images,
      ...(outcome.value.initialVariantId === undefined
        ? {}
        : { initialVariantId: outcome.value.initialVariantId }),
      jsonLd: serializeProductJsonLd(seo.jsonLd),
      productId: outcome.value.product.id,
      publicSlug: outcome.value.publicSlug,
      title: seo.title,
    },
  }
}

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
        <title>{page.value.title}</title>
        {page.value.description ? (
          <meta content={page.value.description} name="description" />
        ) : null}
        <link href={page.value.canonicalUrl} rel="canonical" />
        <meta content="product" property="og:type" />
        <meta content={page.value.title} property="og:title" />
        {page.value.description ? (
          <meta content={page.value.description} property="og:description" />
        ) : null}
        <meta content={page.value.canonicalUrl} property="og:url" />
        {page.value.images.map((image) => (
          <meta content={image} key={image} property="og:image" />
        ))}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON is serialized with script-breaking characters escaped.
          dangerouslySetInnerHTML={{ __html: page.value.jsonLd }}
          type="application/ld+json"
        />
      </Head>
      <main data-product-id={page.value.productId}>
        <h1>{page.value.title}</h1>
        <p data-public-slug={page.value.publicSlug}>
          Stable product URL resolved.
        </p>
      </main>
    </>
  )
}
