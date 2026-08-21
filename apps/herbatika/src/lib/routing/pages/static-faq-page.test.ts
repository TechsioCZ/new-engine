import type { GetServerSidePropsContext } from "next"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchExternalReviewTrustSources: vi.fn(async () => []),
  fetchStorefrontTextMessages: vi.fn(async () => ({})),
  getFaqPageData: vi.fn(() => null),
  getHerbatikaMarketContext: vi.fn(() => ({
    code: "cz",
    locale: "cs-CZ",
  })),
}))

vi.mock("@/components/about/about-page", () => ({ AboutPage: vi.fn() }))
vi.mock("@/components/cms/cms-page-surface", () => ({
  CmsPageSurface: vi.fn(),
}))
vi.mock("@/components/faq/faq-page", () => ({ FaqPage: vi.fn() }))
vi.mock("@/components/faq/faq-page.data", () => ({
  getFaqPageData: mocks.getFaqPageData,
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRoutingRuntime: vi.fn(() => ({
    allowedMarkets: ["cz"],
    bindings: {
      cz: {
        acceptedHosts: ["herbatica.cz"],
        canonicalOrigin: "https://herbatica.cz",
        market: "cz",
      },
    },
    marketByHost: { "herbatica.cz": "cz" },
  })),
}))
vi.mock("@/lib/storefront/external-reviews.server", () => ({
  fetchExternalReviewTrustSources: mocks.fetchExternalReviewTrustSources,
}))
vi.mock("@/lib/storefront/market-context", () => ({
  getHerbatikaMarketContext: mocks.getHerbatikaMarketContext,
}))
vi.mock("@/lib/storefront/storefront-texts.server", () => ({
  fetchStorefrontTextMessages: mocks.fetchStorefrontTextMessages,
}))
vi.mock("@/lib/url/segment-registry-publication.server", () => ({
  loadStaticRoutePublicationDecision: vi.fn(async () => ({
    evidence: {
      editorialApprovalReference: "CZ-EDITORIAL-test",
      frozenRegistrySha256: "f".repeat(64),
      legalApprovalReference: "CZ-LEGAL-test",
      staticContentArtifactSha256: "a".repeat(64),
    },
    kind: "approved",
  })),
}))

import { getServerSideProps } from "@/pages/~sf/[market]/static/[pageKey]"

const requestContext = () => {
  const headers = new Map<string, string>()
  const context = {
    params: { market: "cz", pageKey: "faq" },
    query: {},
    req: {
      headers: {
        "x-sf-canonical-origin": "https://herbatica.cz",
        "x-sf-market": "cz",
        "x-sf-public-path": "/faq",
        "x-sf-route-key": "static.faq",
      },
      url: "/~sf/cz/static/faq",
    },
    res: {
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name.toLowerCase(), value)
      }),
      statusCode: 200,
    },
  } as unknown as GetServerSidePropsContext
  return { context, headers }
}

describe("localized FAQ route", () => {
  it("returns a noindex 503 instead of an empty indexable page", async () => {
    const request = requestContext()

    const result = await getServerSideProps(request.context)

    expect(mocks.getFaqPageData).toHaveBeenCalledWith("cs-CZ")
    expect(result).toMatchObject({
      props: {
        page: { kind: "error", status: 503 },
        seo: { robots: "noindex, nofollow" },
      },
    })
    expect(request.context.res.statusCode).toBe(503)
    expect(request.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(request.headers.get("retry-after")).toBe("30")
    expect(request.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate"
    )
  })
})
