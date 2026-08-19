import { ROUTES } from "@/lib/market/market-runtime-definitions"
import { buildProductPath } from "@/lib/url/product-path"
import { parseMarket } from "@/lib/url/segments"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import {
  type ProductRouteRegistry,
  type ProductRouteSourceProduct,
  type ProductRouteSourceReadInput,
  type ResolvedProductRoute,
  resolveProductRoute,
} from "./product-route"
import type { SsrOutcome } from "./ssr-outcome"

export type ProductPageRequest = Readonly<{
  architectureEnabled: boolean
  headers: Readonly<{
    canonicalizationRequired?: string | readonly string[] | null
    canonicalOrigin?: string | readonly string[] | null
    market?: string | readonly string[] | null
    publicPath?: string | readonly string[] | null
    routeKey?: string | readonly string[] | null
  }>
  marketParam?: string | readonly string[]
  rawQuery: string
  slugParam?: string | readonly string[]
}>

export const rawQueryFromRequestTarget = (
  requestTarget: string | undefined
): string => {
  const queryStart = requestTarget?.indexOf("?") ?? -1
  return queryStart < 0 ? "" : (requestTarget?.slice(queryStart + 1) ?? "")
}

type ProductPageDependencies<Product extends ProductRouteSourceProduct> =
  Readonly<{
    readProductById(
      input: ProductRouteSourceReadInput
    ): Promise<SourceReadResult<Product>>
    readRegistry(): Promise<SourceReadResult<ProductRouteRegistry>>
  }>

const unavailable = (retryAfterSeconds?: number): SsrOutcome<never> => ({
  kind: "unavailable",
  ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
})

const resolveRegistryFailure = (
  result: Exclude<SourceReadResult<ProductRouteRegistry>, { kind: "found" }>
): SsrOutcome<never> =>
  result.kind === "unavailable"
    ? unavailable(result.retryAfterSeconds)
    : unavailable()

const singleValue = (
  value: string | readonly string[] | null | undefined
): string | null => (typeof value === "string" ? value : null)

const resolveTrustedInput = (request: ProductPageRequest) => {
  if (!request.architectureEnabled) {
    return null
  }

  const marketParam = singleValue(request.marketParam)
  const slug = singleValue(request.slugParam)
  const canonicalizationHeader = request.headers.canonicalizationRequired
  const market = marketParam ? parseMarket(marketParam) : null
  if (
    !(market && slug) ||
    (canonicalizationHeader !== undefined &&
      canonicalizationHeader !== null &&
      canonicalizationHeader !== "1")
  ) {
    return null
  }

  let expectedPublicPath: string
  try {
    expectedPublicPath = buildProductPath(market, slug)
  } catch {
    return null
  }

  if (
    singleValue(request.headers.market) !== market ||
    singleValue(request.headers.canonicalOrigin) !==
      ROUTES[market].canonicalOrigin ||
    singleValue(request.headers.routeKey) !== "product.detail" ||
    singleValue(request.headers.publicPath) !== expectedPublicPath
  ) {
    return null
  }

  return {
    canonicalizationRequired: canonicalizationHeader === "1",
    market,
    normalizedSlug: slug,
  }
}

export const resolveProductPageRequest = async <
  Product extends ProductRouteSourceProduct,
>(
  request: ProductPageRequest,
  dependencies: ProductPageDependencies<Product>
): Promise<SsrOutcome<ResolvedProductRoute<Product>>> => {
  const trustedInput = resolveTrustedInput(request)
  if (!trustedInput) {
    return { kind: "not-found" }
  }

  try {
    const registryResult = await dependencies.readRegistry()
    if (registryResult.kind !== "found") {
      return resolveRegistryFailure(registryResult)
    }

    return await resolveProductRoute({
      ...trustedInput,
      rawQuery: request.rawQuery,
      readProductById: dependencies.readProductById,
      registry: registryResult.value,
    })
  } catch {
    return unavailable()
  }
}
