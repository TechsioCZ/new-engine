import type { GetServerSideProps } from "next"
import Head from "next/head"
import { ProductDetail } from "@/components/product-detail"
import { ProductPagesProvider } from "@/components/product-detail/product-pages-provider"
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
import type { ProductPageContext } from "@/lib/storefront/product-page-context"
import type { ProductRouteMedusaProduct } from "@/lib/storefront/product-route-source"
import {
  readProductPageContextFromMedusa,
  readProductRouteSourceFromMedusa,
} from "@/lib/storefront/product-route-source.server"
import { parseMarket } from "@/lib/url/segments"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

type ProductPageView = Readonly<{
  canonicalUrl: string
  context: ProductPageContext
  description: string | null
  images: readonly string[]
  initialVariantId?: string
  jsonLd: string
  product: ProductRouteMedusaProduct
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

const toPageView = async (
  outcome: Awaited<
    ReturnType<typeof resolveProductPageRequest<ProductRouteMedusaProduct>>
  >,
  market: ReturnType<typeof parseMarket>
): Promise<SsrOutcome<ProductPageView>> => {
  if (outcome.kind !== "found") {
    return outcome
  }
  if (!market) {
    return { kind: "unavailable" }
  }

  const context = await readProductPageContextFromMedusa({
    ...(outcome.value.initialVariantId === undefined
      ? {}
      : { initialVariantId: outcome.value.initialVariantId }),
    market,
    product: outcome.value.product,
  })
  if (context.kind !== "found") {
    return context.kind === "unavailable"
      ? {
          kind: "unavailable",
          ...(context.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: context.retryAfterSeconds }),
        }
      : { kind: "unavailable" }
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
      context: context.value,
      description: seo.description,
      images: seo.images,
      ...(outcome.value.initialVariantId === undefined
        ? {}
        : { initialVariantId: outcome.value.initialVariantId }),
      jsonLd: serializeProductJsonLd(seo.jsonLd),
      product: outcome.value.product,
      publicSlug: outcome.value.publicSlug,
      title: seo.title,
    },
  }
}

export const getServerSideProps = (async ({ params, req, res }) => {
  const marketHeader = singleHeader(req.headers["x-sf-market"])
  const request: ProductPageRequest = {
    enabled: process.env.URL_PRODUCT_RESOLVER_ENABLED === "1",
    headers: {
      canonicalOrigin: singleHeader(req.headers["x-sf-canonical-origin"]),
      market: marketHeader,
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

  const pageOutcome = await toPageView(
    outcome,
    typeof marketHeader === "string" ? parseMarket(marketHeader) : null
  ).catch((): SsrOutcome<ProductPageView> => ({ kind: "unavailable" }))
  if (res.headersSent) {
    throw new Error("Product route resolved after response headers were sent")
  }
  res.setHeader("X-SF-Resolution-Phase", "pre-flush")
  return applySsrOutcome(res, pageOutcome)
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
      <ProductPagesProvider context={page.value.context}>
        <div
          data-product-id={page.value.product.id}
          data-public-slug={page.value.publicSlug}
        >
          <ProductDetail
            {...(page.value.initialVariantId === undefined
              ? {}
              : { initialVariantId: page.value.initialVariantId })}
            initialProduct={page.value.product}
          />
        </div>
      </ProductPagesProvider>
    </>
  )
}
