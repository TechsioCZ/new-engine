import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/about/about-page", () => ({ AboutPage: vi.fn() }))
vi.mock("@/components/cms/cms-page-surface", () => ({
  CmsPageSurface: vi.fn(),
}))
vi.mock("@/components/faq/faq-page", () => ({ FaqPage: vi.fn() }))
vi.mock("@/components/faq/faq-page.data", () => ({
  getFaqPageData: vi.fn(),
}))
vi.mock("@/lib/routing/public-page", () => ({
  resolveStaticPublicPage: vi.fn(
    (_context: unknown, input: { loadSource: (market: "cz") => unknown }) =>
      input.loadSource("cz")
  ),
}))
vi.mock("@/lib/storefront/cms", () => ({
  readCmsStaticPageWithDemoFallback: vi.fn(),
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

describe("root-static CMS page source", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("loads CMS content by deployment-bound stable ID", async () => {
    const { readCmsStaticPageWithDemoFallback } = await import(
      "@/lib/storefront/cms"
    )
    vi.mocked(readCmsStaticPageWithDemoFallback).mockResolvedValue({
      kind: "found",
      value: { id: 77, title: "Privacy" },
    })
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/static/[pageKey]"
    )

    await expect(
      getServerSideProps({ params: { pageKey: "privacy" } } as never)
    ).resolves.toEqual({
      kind: "found",
      value: { kind: "cms", page: { id: 77, title: "Privacy" } },
    })
    expect(readCmsStaticPageWithDemoFallback).toHaveBeenCalledWith(
      "privacy",
      "cs-CZ"
    )
  })

  it("fails closed when the market has no localized FAQ source", async () => {
    const { getFaqPageData } = await import("@/components/faq/faq-page.data")
    vi.mocked(getFaqPageData).mockReturnValue(null)
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/static/[pageKey]"
    )

    await expect(
      getServerSideProps({ params: { pageKey: "faq" } } as never)
    ).resolves.toEqual({
      causeCode: "UNSUPPORTED_FAQ_PAGE_LOCALE",
      kind: "invalid-response",
    })
    expect(getFaqPageData).toHaveBeenCalledWith("cs-CZ")
  })

  it("publishes the FAQ source only when localized data exists", async () => {
    const { getFaqPageData } = await import("@/components/faq/faq-page.data")
    vi.mocked(getFaqPageData).mockReturnValue({
      intro: "Localized intro",
      items: [],
      title: "Localized FAQ",
    })
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/static/[pageKey]"
    )

    await expect(
      getServerSideProps({ params: { pageKey: "faq" } } as never)
    ).resolves.toEqual({ kind: "found", value: { kind: "faq" } })
    expect(getFaqPageData).toHaveBeenCalledWith("cs-CZ")
  })

  it("fails closed before reading an indexable source without G1 approval", async () => {
    const { loadStaticRoutePublicationDecision } = await import(
      "@/lib/url/segment-registry-publication.server"
    )
    const { readCmsStaticPageWithDemoFallback } = await import(
      "@/lib/storefront/cms"
    )
    vi.mocked(loadStaticRoutePublicationDecision).mockResolvedValueOnce({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/static/[pageKey]"
    )

    await expect(
      getServerSideProps({ params: { pageKey: "privacy" } } as never)
    ).resolves.toEqual({ kind: "unavailable", retryAfterSeconds: 30 })
    expect(readCmsStaticPageWithDemoFallback).not.toHaveBeenCalled()
  })

  it.each([
    { kind: "missing" as const },
    { kind: "unavailable" as const, retryAfterSeconds: 9 },
    { kind: "invalid-response" as const, causeCode: "INVALID_PAGE" },
  ])("preserves the $kind source outcome", async (sourceResult) => {
    const { readCmsStaticPageWithDemoFallback } = await import(
      "@/lib/storefront/cms"
    )
    vi.mocked(readCmsStaticPageWithDemoFallback).mockResolvedValue(sourceResult)
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/static/[pageKey]"
    )

    await expect(
      getServerSideProps({ params: { pageKey: "privacy" } } as never)
    ).resolves.toEqual(sourceResult)
  })
})
