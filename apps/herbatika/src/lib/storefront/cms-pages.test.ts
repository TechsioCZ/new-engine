import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("./cms-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("./cms-client")>()
  return { ...original, readCmsJson: vi.fn() }
})
vi.mock("./cms-content", () => ({
  rewriteCmsHtmlMediaUrls: (value: string) => `normalized:${value}`,
}))

describe("CMS page source reads", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("returns a normalized stable-ID page", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({
      kind: "found",
      value: {
        page: { id: 7, slug: "legacy-slug", title: "Privacy", content: "html" },
      },
    })
    const { readCmsPageById } = await import("./cms-pages")

    await expect(readCmsPageById("7", "cs-CZ")).resolves.toEqual({
      kind: "found",
      value: {
        id: 7,
        slug: "legacy-slug",
        title: "Privacy",
        content: "normalized:html",
      },
    })
    expect(readCmsJson).toHaveBeenCalledWith("pages/by-id/7", {
      locale: "cs-CZ",
    })
  })

  it("rejects a malformed 200 response instead of treating it as missing", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({ kind: "found", value: {} })
    const { readCmsPageById } = await import("./cms-pages")

    await expect(readCmsPageById("7", "cs-CZ")).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_PAGE_ENVELOPE",
    })
  })

  it("rejects a page whose returned stable ID differs from the request", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({
      kind: "found",
      value: { page: { id: 8, title: "Privacy" } },
    })
    const { readCmsPageById } = await import("./cms-pages")

    await expect(readCmsPageById("7", "cs-CZ")).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "MISMATCHED_PAGE_ID",
    })
  })

  it("binds root-static content to an immutable Payload ID", async () => {
    vi.stubEnv("HERBATIKA_CMS_STATIC_PAGE_IDS", JSON.stringify({ privacy: 77 }))
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({ kind: "missing" })
    const { readCmsStaticPage } = await import("./cms-pages")

    await expect(readCmsStaticPage("privacy", "ro-RO")).resolves.toEqual({
      kind: "missing",
    })
    expect(readCmsJson).toHaveBeenCalledWith("pages/by-id/77", {
      locale: "ro-RO",
    })
  })

  it("fails closed when a root-static binding is absent", async () => {
    vi.stubEnv("HERBATIKA_CMS_STATIC_PAGE_IDS", JSON.stringify({ about: 1 }))
    const { readCmsStaticPage } = await import("./cms-pages")

    await expect(readCmsStaticPage("terms", "sk-SK")).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "MISSING_STATIC_PAGE_BINDING_TERMS",
    })
  })

  it("uses an explicitly marked RO demo fallback when Payload is unbound", async () => {
    vi.stubEnv("HERBATIKA_CMS_STATIC_PAGE_IDS", JSON.stringify({ about: 1 }))
    const { readCmsStaticPageWithDemoFallback } = await import("./cms-pages")

    await expect(
      readCmsStaticPageWithDemoFallback("terms", "ro-RO")
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        id: "demo-generated-unreviewed:ro:terms",
        title: "Termeni și condiții",
      },
    })
  })

  it("does not leak the RO demo fallback into SK", async () => {
    vi.stubEnv("HERBATIKA_CMS_STATIC_PAGE_IDS", JSON.stringify({ about: 1 }))
    const { readCmsStaticPageWithDemoFallback } = await import("./cms-pages")

    await expect(
      readCmsStaticPageWithDemoFallback("terms", "sk-SK")
    ).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "MISSING_STATIC_PAGE_BINDING_TERMS",
    })
  })

  it("prefers exact-locale Payload content over the RO demo fallback", async () => {
    vi.stubEnv("HERBATIKA_CMS_STATIC_PAGE_IDS", JSON.stringify({ terms: 77 }))
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({
      kind: "found",
      value: { page: { id: 77, title: "Termeni aprobați" } },
    })
    const { readCmsStaticPageWithDemoFallback } = await import("./cms-pages")

    await expect(
      readCmsStaticPageWithDemoFallback("terms", "ro-RO")
    ).resolves.toEqual({
      kind: "found",
      value: { id: 77, content: "normalized:", title: "Termeni aprobați" },
    })
  })
})
