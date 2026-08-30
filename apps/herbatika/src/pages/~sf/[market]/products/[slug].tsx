import type { GetServerSideProps } from "next"
import Head from "next/head"
import { useTranslations } from "next-intl"
import { ProductDetail } from "@/components/product-detail"
import { ProductPagesProvider } from "@/components/product-detail/product-pages-provider"
import {
  type ProductPageRequest,
  rawQueryFromRequestTarget,
  resolveProductPageRequest,
} from "@/lib/routing/pages/product-page"
import type {
  ProductRouteRegistry,
  ResolvedProductRoute,
} from "@/lib/routing/pages/product-route"
import {
  applySsrOutcome,
  type SsrOutcome,
  type SsrPageProps,
} from "@/lib/routing/pages/ssr-outcome"
import {
  loadEntityAlternates,
  loadPublicErrorShell,
  loadPublicShell,
  type StorefrontShellProps,
} from "@/lib/routing/public-page"
import { buildProductSeo, serializeProductJsonLd } from "@/lib/seo/product"
import type { ProductPageContext } from "@/lib/storefront/product-page-context"
import type { ProductRouteMedusaProduct } from "@/lib/storefront/product-route-source"
import {
  readProductAlternateSourceFromMedusa,
  readProductPageContextFromMedusa,
  readProductRouteSourceByHandleFromMedusa,
  readProductRouteSourceFromMedusa,
} from "@/lib/storefront/product-route-source.server"
import {
  type PublicEntitySlugMap,
  readAvailablePublicEntitySlugs,
  readRequiredPublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"
import { buildProductAbsoluteUrl } from "@/lib/url/product-path"
import { buildPublicOpenGraphLocales } from "@/lib/url/public-seo"
import { parseMarket } from "@/lib/url/segments"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"

type ProductPageView = Readonly<{
  alternates: Readonly<Record<string, string>>
  brandPublicSlugsById: PublicEntitySlugMap
  canonicalUrl: string
  categoryPublicSlugsById: PublicEntitySlugMap
  context: ProductPageContext
  description: string | null
  images: readonly string[]
  initialVariantId?: string
  jsonLd: string
  product: ProductRouteMedusaProduct
  productPublicSlugsById: PublicEntitySlugMap
  publicSlug: string
  title: string
}>

type ProductPageProps = SsrPageProps<ProductPageView> & StorefrontShellProps

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

const readProductAlternates = async (
  market: NonNullable<ReturnType<typeof parseMarket>>,
  productId: string
): Promise<Readonly<Record<string, string>>> => {
  const runtime = await getUrlRegistryRuntime()
  if (!runtime.enabled) {
    throw new Error("URL registry is disabled")
  }
  const current = await runtime.registry.findActiveEntityRoute({
    market,
    sourceId: productId,
    sourceSystem: "medusa",
    sourceType: "product",
  })
  if (current.kind !== "found") {
    throw new Error("Current product route is unavailable")
  }
  return loadEntityAlternates(
    current.value,
    ({ market: targetMarket, publicSlug, sourceId, sourceVersion }) =>
      readProductAlternateSourceFromMedusa({
        market: targetMarket,
        productId: sourceId,
        publicSlug,
        sourceVersion,
      })
  )
}

const singleHeader = (value: string | string[] | undefined) => value

type ProductProjectionMaps = Readonly<{
  brandPublicSlugsById: PublicEntitySlugMap
  categoryPublicSlugsById: PublicEntitySlugMap
  productPublicSlugsById: PublicEntitySlugMap
}>

// Registry-free path: Medusa handles are the public slugs and brand links are
// dropped because they have no registry projection to link to.
const handleProjectionMaps = (
  product: ProductRouteMedusaProduct
): ProductProjectionMaps => ({
  brandPublicSlugsById: {},
  categoryPublicSlugsById: Object.fromEntries(
    (product.categories ?? []).flatMap((category) =>
      category.handle ? [[category.id, category.handle]] : []
    )
  ),
  productPublicSlugsById: { [product.id]: product.handle },
})

const resolveProductByHandle = async (
  market: ReturnType<typeof parseMarket>,
  slugParam: string | string[] | undefined
): Promise<SsrOutcome<ResolvedProductRoute<ProductRouteMedusaProduct>>> => {
  if (!(market && typeof slugParam === "string")) {
    return { kind: "not-found" }
  }
  let canonicalUrl: string
  try {
    canonicalUrl = buildProductAbsoluteUrl(market, slugParam)
  } catch {
    return { kind: "not-found" }
  }
  const result = await readProductRouteSourceByHandleFromMedusa({
    market,
    publicSlug: slugParam,
  })
  if (result.kind !== "found") {
    return result.kind === "missing"
      ? { kind: "not-found" }
      : { kind: "unavailable" }
  }
  return {
    kind: "found",
    value: { canonicalUrl, product: result.value, publicSlug: slugParam },
  }
}

const unavailableFromSource = <Value,>(
  result: Exclude<SourceReadResult<Value>, { kind: "found" }>
): SsrOutcome<never> =>
  result.kind === "unavailable"
    ? {
        kind: "unavailable",
        ...(result.retryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: result.retryAfterSeconds }),
      }
    : { kind: "unavailable" }

const readProductProjectionMaps = async (
  market: NonNullable<ReturnType<typeof parseMarket>>,
  product: ProductRouteMedusaProduct
): Promise<SsrOutcome<ProductProjectionMaps>> => {
  const categorySourceIds = (product.categories ?? []).map(
    (category) => category.id
  )
  if (categorySourceIds.some((sourceId) => !sourceId)) {
    return { kind: "unavailable" }
  }
  const productBrand = (
    product as ProductRouteMedusaProduct & { brand?: { id?: unknown } | null }
  ).brand
  const brandSourceId =
    productBrand && typeof productBrand.id === "string" && productBrand.id
      ? productBrand.id
      : null
  if (productBrand && !brandSourceId) {
    return { kind: "unavailable" }
  }

  // Brand routes may not be projected in the registry yet; a missing brand
  // slug drops the brand link instead of taking the whole PDP down.
  const [brandMap, categoryMap, productMap] = await Promise.all([
    readAvailablePublicEntitySlugs({
      kind: "brand",
      market,
      requiredSourceIds: brandSourceId ? [brandSourceId] : [],
    }),
    readRequiredPublicEntitySlugs({
      kind: "category",
      market,
      requiredSourceIds: categorySourceIds,
    }),
    readRequiredPublicEntitySlugs({
      kind: "product",
      market,
      requiredSourceIds: [product.id],
    }),
  ])
  if (brandMap.kind !== "found") {
    return unavailableFromSource(brandMap)
  }
  if (categoryMap.kind !== "found") {
    return unavailableFromSource(categoryMap)
  }
  if (productMap.kind !== "found") {
    return unavailableFromSource(productMap)
  }
  return {
    kind: "found",
    value: {
      brandPublicSlugsById: brandMap.value,
      categoryPublicSlugsById: categoryMap.value,
      productPublicSlugsById: productMap.value,
    },
  }
}

const toPageView = async (
  outcome: SsrOutcome<ResolvedProductRoute<ProductRouteMedusaProduct>>,
  market: ReturnType<typeof parseMarket>,
  registryProjections: boolean
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
    locale: context.value.marketContext.locale,
    product: outcome.value.product,
  })
  const alternates = registryProjections
    ? await readProductAlternates(market, outcome.value.product.id)
    : {}
  const projectionMaps: SsrOutcome<ProductProjectionMaps> = registryProjections
    ? await readProductProjectionMaps(market, outcome.value.product)
    : { kind: "found", value: handleProjectionMaps(outcome.value.product) }
  if (projectionMaps.kind !== "found") {
    return projectionMaps
  }

  return {
    kind: "found",
    value: {
      alternates,
      brandPublicSlugsById: projectionMaps.value.brandPublicSlugsById,
      canonicalUrl: seo.canonicalUrl,
      categoryPublicSlugsById: projectionMaps.value.categoryPublicSlugsById,
      context: context.value,
      description: seo.description,
      images: seo.images,
      ...(outcome.value.initialVariantId === undefined
        ? {}
        : { initialVariantId: outcome.value.initialVariantId }),
      jsonLd: serializeProductJsonLd(seo.jsonLd),
      product: outcome.value.product,
      productPublicSlugsById: projectionMaps.value.productPublicSlugsById,
      publicSlug: outcome.value.publicSlug,
      title: seo.title,
    },
  }
}

export const getServerSideProps = (async ({ params, req, res }) => {
  const marketHeader = singleHeader(req.headers["x-sf-market"])
  const request: ProductPageRequest = {
    architectureEnabled: process.env.URL_ARCHITECTURE_ENABLED === "1",
    headers: {
      canonicalizationRequired: singleHeader(
        req.headers["x-sf-canonicalization-required"]
      ),
      canonicalOrigin: singleHeader(req.headers["x-sf-canonical-origin"]),
      market: marketHeader,
      publicPath: singleHeader(req.headers["x-sf-public-path"]),
      routeKey: singleHeader(req.headers["x-sf-route-key"]),
    },
    marketParam: params?.market,
    rawQuery: rawQueryFromRequestTarget(req.url),
    slugParam: params?.slug,
  }
  const headerMarket =
    typeof marketHeader === "string" ? parseMarket(marketHeader) : null
  const registry = await readRegistry()
  const registryOutcome =
    registry.kind === "found"
      ? await resolveProductPageRequest(request, {
          readProductById: readProductRouteSourceFromMedusa,
          readRegistry: () => Promise.resolve(registry),
        })
      : null
  const byHandle = !registryOutcome || registryOutcome.kind === "not-found"
  const outcome = byHandle
    ? await resolveProductByHandle(headerMarket, params?.slug)
    : registryOutcome

  const pageOutcome = await toPageView(outcome, headerMarket, !byHandle).catch(
    (): SsrOutcome<ProductPageView> => ({ kind: "unavailable" })
  )
  if (res.headersSent) {
    throw new Error("Product route resolved after response headers were sent")
  }
  res.setHeader("X-SF-Resolution-Phase", "pre-flush")
  const result = applySsrOutcome(res, pageOutcome)
  if (!("props" in result)) {
    return result
  }
  if (!headerMarket) {
    return { notFound: true }
  }
  const pageProps = await result.props
  const shell =
    pageOutcome.kind === "found"
      ? await loadPublicShell(headerMarket)
      : await loadPublicErrorShell(headerMarket)
  return { props: { ...pageProps, ...shell } }
}) satisfies GetServerSideProps<ProductPageProps>

export default function ProductPagesRoute({ page }: ProductPageProps) {
  const tCatalog = useTranslations("catalog")

  if (page.kind === "error") {
    return (
      <>
        <Head>
          <meta content="noindex, nofollow" name="robots" />
        </Head>
        <main>
          <h1>{tCatalog("product_detail.errors.page_unavailable")}</h1>
          <p>
            {tCatalog("product_detail.errors.page_status", {
              status: page.status,
            })}
          </p>
        </main>
      </>
    )
  }

  const openGraphLocales = buildPublicOpenGraphLocales({
    alternates: page.value.alternates,
    locale: page.value.context.marketContext.locale,
  })

  return (
    <>
      <Head>
        <title>{`${page.value.title} | ${page.value.context.marketContext.metadata.title}`}</title>
        {page.value.description ? (
          <meta content={page.value.description} name="description" />
        ) : null}
        <link href={page.value.canonicalUrl} rel="canonical" />
        {Object.entries(page.value.alternates).map(([hrefLang, href]) => (
          <link
            href={href}
            hrefLang={hrefLang}
            key={hrefLang}
            rel="alternate"
          />
        ))}
        <meta content="product" property="og:type" />
        <meta content={openGraphLocales.locale} property="og:locale" />
        {openGraphLocales.alternateLocales.map((locale) => (
          <meta content={locale} key={locale} property="og:locale:alternate" />
        ))}
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
            brandPublicSlugsById={page.value.brandPublicSlugsById}
            categoryPublicSlugsById={page.value.categoryPublicSlugsById}
            {...(page.value.initialVariantId === undefined
              ? {}
              : { initialVariantId: page.value.initialVariantId })}
            initialProduct={page.value.product}
            productPublicSlugsById={page.value.productPublicSlugsById}
            publicSlug={page.value.publicSlug}
          />
        </div>
      </ProductPagesProvider>
    </>
  )
}
