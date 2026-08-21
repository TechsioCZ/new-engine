import type { HttpTypes } from "@medusajs/types"
import {
  createMedusaSdk,
  type MedusaSdk,
} from "@techsio/storefront-data/shared/medusa-client"
import { loadMedusaStorefrontMessages } from "@techsio/storefront-i18n/medusa/messages"
import { getMarketRuntime, type MarketCode } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { applyOperatorContactAuthority } from "./operator-contact-authority.server"
import {
  type ProductPageContextRequest,
  readProductPageContext,
} from "./product-page-context"
import {
  type ProductIdentitySourceRequest,
  type ProductRouteSourceMarketBinding,
  type ProductRouteSourceRequest,
  readProductIdentitySource,
  readProductRouteSource,
} from "./product-route-source"
import { resolveMedusaBackendUrl } from "./runtime-env"

// This module is imported only by server entry points (GSSP/Route Handlers).
// Pages Router rejects the App-Router-only `server-only` marker, so callers
// must keep it out of client and page render-component imports.

const PRODUCT_SOURCE_TIMEOUT_MS = 5000
const sdkByMarket = new Map<MarketCode, MedusaSdk>()

const getMarketSdk = (binding: ProductRouteSourceMarketBinding): MedusaSdk => {
  const existing = sdkByMarket.get(binding.market)
  if (existing) {
    return existing
  }
  const sdk = createMedusaSdk({
    baseUrl: resolveMedusaBackendUrl(),
    publishableKey: binding.publishableApiKey,
  })
  sdkByMarket.set(binding.market, sdk)
  return sdk
}

export const readProductRouteSourceFromMedusa = (
  input: ProductRouteSourceRequest
) =>
  readProductRouteSource(input, {
    resolveMarket: (market) =>
      getMarketRuntime(getConfiguredMarketRuntime(), market),
    retrieveProduct: ({ binding, productId, query }) => {
      const sdk = getMarketSdk(binding)
      // The SDK's high-level retrieve method has no AbortSignal input. Its
      // client keeps the publishable-key behavior while allowing hard timeout.
      return sdk.client.fetch<HttpTypes.StoreProductResponse>(
        `/store/products/${encodeURIComponent(productId)}`,
        {
          query,
          signal: AbortSignal.timeout(PRODUCT_SOURCE_TIMEOUT_MS),
        }
      )
    },
    retrievePublicationSource: ({ binding, market, productId }) =>
      getMarketSdk(binding).client.fetch(
        `/store/url-registry/products/${encodeURIComponent(productId)}/source`,
        {
          query: { market },
          signal: AbortSignal.timeout(PRODUCT_SOURCE_TIMEOUT_MS),
        }
      ),
  })

export const readProductIdentityFromMedusa = (
  input: ProductIdentitySourceRequest
) =>
  readProductIdentitySource(input, {
    resolveMarket: (market) =>
      getMarketRuntime(getConfiguredMarketRuntime(), market),
    retrieveProduct: ({ binding, productId, query }) =>
      getMarketSdk(binding).client.fetch<HttpTypes.StoreProductResponse>(
        `/store/products/${encodeURIComponent(productId)}`,
        {
          query,
          signal: AbortSignal.timeout(PRODUCT_SOURCE_TIMEOUT_MS),
        }
      ),
    retrievePublicationSource: () =>
      Promise.reject(
        new Error("Publication proof is not used for identity reads")
      ),
  })

export const readProductPageContextFromMedusa = (
  input: ProductPageContextRequest
) =>
  readProductPageContext(input, {
    resolveMarket: (market) =>
      getMarketRuntime(getConfiguredMarketRuntime(), market),
    loadMessages: ({ binding, locale, market }) =>
      loadMedusaStorefrontMessages(getMarketSdk(binding).client, {
        locale,
        market,
        signal: AbortSignal.timeout(PRODUCT_SOURCE_TIMEOUT_MS),
      }).then((messages) => applyOperatorContactAuthority(market, messages)),
  })
