export const SOURCE_ASSERTIONS = Object.freeze({
  "source.proxy-and-market-boundary": [
    "src/lib/market/market-runtime.test.ts",
    "src/lib/storefront/market-sdk-authority.test.ts",
    "src/lib/routing/public-proxy.test.ts",
    "src/proxy.test.ts",
  ],
  "source.segment-and-public-url-contract": [
    "src/lib/url/segments.test.ts",
    "src/lib/url/public-url.test.ts",
    "src/lib/url/public-route-api.test.ts",
    "src/lib/routing/app-router-inventory.test.ts",
  ],
  "source.slug-and-registry-invariants": [
    "src/lib/url/slug.test.ts",
    "src/lib/url/path-collision.test.ts",
    "src/lib/url-registry/memory.behavior.test.ts",
    "src/lib/url-registry/population/population.test.ts",
    "tests/url-registry/postgres.behavior.integration.ts",
    "tests/url-registry/postgres.constraints.integration.ts",
    "tests/url-registry/postgres.population.integration.ts",
  ],
  "source.parsed-path-safety": [
    "src/lib/url/public-route-api.test.ts",
    "src/lib/routing/public-proxy.test.ts",
  ],
  "source.query-contract": [
    "src/lib/url/query-normalizer.test.ts",
    "src/lib/url/public-route-api.test.ts",
  ],
  "source.seo-contract": [
    "src/lib/url/public-seo.test.ts",
    "src/lib/seo/product.test.ts",
    "src/lib/url/public-route-api.test.ts",
  ],
  "source.cache-and-invalidation-contract": [
    "src/lib/url-registry/invalidation-tags.test.ts",
    "src/lib/url-registry/runtime/invalidation-contract.test.ts",
    "src/lib/url-registry/runtime/invalidation-consumer.test.ts",
  ],
  "source.discriminated-read-contract": [
    "src/lib/storefront/product-route-source.test.ts",
    "src/lib/storefront/collections-route-source.test.ts",
    "src/lib/storefront/cms-pages.test.ts",
    "src/lib/routing/pages/ssr-outcome.test.ts",
  ],
  "source.resolver-integration": [
    "src/lib/url/public-route-api.test.ts",
    "src/lib/routing/pages/product-route.test.ts",
    "src/lib/url-registry/memory.behavior.test.ts",
    "tests/url-registry/postgres.behavior.integration.ts",
  ],
  "source.catalog-projection-integration": [
    "src/lib/storefront/product-route-source.server.test.ts",
    "src/lib/storefront/collections-route-source.server.test.ts",
    "src/lib/storefront/ssr/public-entity-projections.test.ts",
    "src/components/products/product-index-page.test.tsx",
  ],
  "source.query-and-seo-integration": [
    "src/lib/url/public-route-api.test.ts",
    "src/lib/url/public-seo.test.ts",
    "src/components/product-detail/product-detail-query.test.ts",
  ],
  "source.private-flow-security": [
    "src/lib/routing/private-flows/opaque-values.test.ts",
    "src/lib/routing/private-flows/private-pages.server.test.ts",
    "src/lib/routing/private-flows/transactional-page.server.test.ts",
  ],
  "source.system-seo-integration": [
    "src/lib/seo/system-routes.test.ts",
    "src/lib/seo/sitemaps.test.ts",
    "src/lib/seo/product-feed.test.ts",
  ],
  "source.empty-legacy-inventory": [
    "src/lib/routing/app-router-inventory.test.ts",
    "src/lib/url/public-route-api.test.ts",
  ],
  "source.release-config": [
    "next.config.test.ts",
    "scripts/assert-next-build.node-test.mjs",
  ],
})

export const WIRE_ASSERTIONS = Object.freeze([
  "wire.host-method-and-spoofing",
  "wire.raw-request-boundary",
  "wire.query-normalization",
  "wire.html-and-system-seo",
  "wire.dependency-outages",
  "wire.redirect-and-method-contract",
  "wire.market-content-isolation",
  "wire.secret-non-leakage",
  "wire.sitemap-crawl",
  "wire.four-host-parity",
  "wire.empty-legacy-manifest",
  "wire.pages-status-and-metadata",
  "wire.internal-link-crawl",
  "wire.document-navigation",
  "wire.browser-document-navigation",
  "wire.lifecycle-invalidation",
])
