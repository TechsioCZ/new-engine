import { buildProductAbsoluteUrl } from "@/lib/url/product-path"
import { normalizeQuery } from "@/lib/url/query-normalizer"
import { validatePublishedSlug } from "@/lib/url/slug"
import type { Market } from "@/lib/url/types"
import type {
  EntityUrlRoute,
  SourceReadResult,
  UrlRegistry,
  UrlRegistryResolution,
} from "@/lib/url-registry/contracts"
import type { SsrOutcome } from "./ssr-outcome"

export type ProductRouteVariant = Readonly<{
  id: string
  sku?: string | null
}>

export type ProductRouteSourceProduct = Readonly<{
  id: string
  variants: readonly ProductRouteVariant[]
}>

export type ProductRouteRegistry = Pick<UrlRegistry, "resolve">

export type ProductRouteSourceReadInput = Readonly<{
  market: Market
  productId: string
  publicSlug: string
}>

type ProductRouteInput<Product extends ProductRouteSourceProduct> = Readonly<{
  canonicalizationRequired: boolean
  market: Market
  normalizedSlug: string
  rawQuery: string
  readProductById: (
    input: ProductRouteSourceReadInput
  ) => Promise<SourceReadResult<Product>>
  registry: ProductRouteRegistry
}>

export type ResolvedProductRoute<Product extends ProductRouteSourceProduct> =
  Readonly<{
    canonicalUrl: string
    initialVariantId?: string
    product: Product
    publicSlug: string
  }>

const unavailable = (retryAfterSeconds?: number): SsrOutcome<never> => ({
  kind: "unavailable",
  ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
})

const sourceFailure = <Value>(
  result: Exclude<SourceReadResult<Value>, { kind: "found" | "missing" }>
): SsrOutcome<never> =>
  result.kind === "unavailable"
    ? unavailable(result.retryAfterSeconds)
    : unavailable()

const resolveTargetRoute = (
  resolution: Exclude<UrlRegistryResolution, { disposition: "gone" }>
): EntityUrlRoute =>
  resolution.disposition === "superseded"
    ? resolution.successorRoute
    : resolution.route

const isMedusaProductRoute = (route: EntityUrlRoute, market: Market) =>
  route.kind === "product" &&
  route.market === market &&
  route.sourceSystem === "medusa" &&
  route.sourceType === "product"

const resolveVariantId = (
  product: ProductRouteSourceProduct,
  variantKey: string | undefined
): SourceReadResult<string | undefined> => {
  if (variantKey === undefined) {
    return { kind: "found", value: undefined }
  }

  const matches = product.variants.filter(
    (variant) => variant.id === variantKey || variant.sku === variantKey
  )
  if (matches.length === 0) {
    return { kind: "missing" }
  }
  if (matches.length !== 1 || !matches[0]?.id) {
    return { kind: "invalid-response", causeCode: "AMBIGUOUS_VARIANT" }
  }
  return { kind: "found", value: matches[0].id }
}

const isValidVariant = (variant: unknown): variant is ProductRouteVariant =>
  typeof variant === "object" &&
  variant !== null &&
  "id" in variant &&
  typeof variant.id === "string" &&
  variant.id.length > 0 &&
  (!("sku" in variant) ||
    variant.sku === null ||
    variant.sku === undefined ||
    typeof variant.sku === "string")

const isValidProductPayload = (
  product: ProductRouteSourceProduct | null | undefined,
  expectedId: string
) =>
  typeof product === "object" &&
  product !== null &&
  product.id === expectedId &&
  Array.isArray(product.variants) &&
  product.variants.every(isValidVariant)

const isValidResolution = (
  resolution: UrlRegistryResolution,
  market: Market,
  normalizedSlug: string
): boolean => {
  const { matchedSlug, route } = resolution
  if (
    matchedSlug.market !== market ||
    matchedSlug.kind !== "product" ||
    matchedSlug.normalizedSlug !== normalizedSlug ||
    (route !== null && (route.market !== market || route.kind !== "product"))
  ) {
    return false
  }
  if (resolution.disposition === "gone") {
    return route === null || route.status === "retired"
  }

  const currentRoute = resolveTargetRoute(resolution)
  const expectedRouteStatus =
    resolution.disposition === "superseded" ? "superseded" : "active"
  return (
    resolution.route.status === expectedRouteStatus &&
    currentRoute.status === "active" &&
    resolution.currentSlug.market === market &&
    resolution.currentSlug.kind === "product" &&
    resolution.currentSlug.disposition === "current"
  )
}

const requiresCanonicalRedirect = (
  canonicalizationRequired: boolean,
  disposition: "alias" | "current" | "superseded",
  queryKind: "accept" | "redirect"
) =>
  canonicalizationRequired ||
  disposition !== "current" ||
  queryKind === "redirect"

const readValidProduct = async <Product extends ProductRouteSourceProduct>(
  readProductById: ProductRouteInput<Product>["readProductById"],
  market: Market,
  productId: string,
  publicSlug: string
): Promise<SourceReadResult<Product>> => {
  const result = await readProductById({ market, productId, publicSlug })
  if (result.kind !== "found") {
    return result
  }
  return isValidProductPayload(result.value, productId)
    ? result
    : { kind: "invalid-response", causeCode: "INVALID_PRODUCT_IDENTITY" }
}

export const resolveProductRoute = async <
  Product extends ProductRouteSourceProduct,
>({
  canonicalizationRequired,
  market,
  normalizedSlug,
  rawQuery,
  readProductById,
  registry,
}: ProductRouteInput<Product>): Promise<
  SsrOutcome<ResolvedProductRoute<Product>>
> => {
  const query = normalizeQuery({ rawQuery, routeKind: "product-detail" })
  if (query.kind === "not-found") {
    return { kind: "not-found" }
  }

  try {
    validatePublishedSlug(normalizedSlug)
  } catch {
    return { kind: "not-found" }
  }

  const registryResult = await registry.resolve({
    market,
    kind: "product",
    normalizedSlug,
  })
  if (registryResult.kind === "missing") {
    return { kind: "not-found" }
  }
  if (registryResult.kind !== "found") {
    return sourceFailure(registryResult)
  }

  const resolution = registryResult.value
  if (!isValidResolution(resolution, market, normalizedSlug)) {
    return unavailable()
  }
  if (resolution.disposition === "gone") {
    return { kind: "gone" }
  }

  const targetRoute = resolveTargetRoute(resolution)
  if (!isMedusaProductRoute(targetRoute, market)) {
    return unavailable()
  }

  const productResult = await readValidProduct(
    readProductById,
    market,
    targetRoute.sourceId,
    resolution.currentSlug.normalizedSlug
  )
  if (productResult.kind === "missing") {
    return { kind: "not-found" }
  }
  if (productResult.kind !== "found") {
    return sourceFailure(productResult)
  }
  const variantResult = resolveVariantId(
    productResult.value,
    query.values.variant
  )
  if (variantResult.kind === "missing") {
    return { kind: "not-found" }
  }
  if (variantResult.kind !== "found") {
    return sourceFailure(variantResult)
  }

  const publicSlug = resolution.currentSlug.normalizedSlug
  const canonicalUrl = buildProductAbsoluteUrl(market, publicSlug)
  if (
    requiresCanonicalRedirect(
      canonicalizationRequired,
      resolution.disposition,
      query.kind
    )
  ) {
    const redirectSearchParams = Object.fromEntries([
      ...(query.values.variant === undefined
        ? []
        : [["variant", query.values.variant] as const]),
      ...query.tracking.map(({ key, value }) => [key, value] as const),
    ])
    return {
      kind: "redirect",
      destination: buildProductAbsoluteUrl(
        market,
        publicSlug,
        redirectSearchParams
      ),
      statusCode: 308,
    }
  }

  return {
    kind: "found",
    value: {
      canonicalUrl,
      ...(variantResult.value === undefined
        ? {}
        : { initialVariantId: variantResult.value }),
      product: productResult.value,
      publicSlug,
    },
  }
}
