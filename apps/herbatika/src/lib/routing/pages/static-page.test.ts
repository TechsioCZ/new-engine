import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/about/about-page", () => ({ AboutPage: vi.fn() }))
vi.mock("@/components/cms/cms-page-surface", () => ({
  CmsPageSurface: vi.fn(),
}))
vi.mock("@/components/faq/faq-page", () => ({ FaqPage: vi.fn() }))
vi.mock("@/lib/routing/public-page", () => ({
  resolveStaticPublicPage: vi.fn(
    (_context: unknown, input: { loadSource: (market: "cz") => unknown }) =>
      input.loadSource("cz")
  ),
}))
vi.mock("@/lib/storefront/cms", () => ({
  readCmsStaticPageWithDemoFallback: vi.fn(),
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
