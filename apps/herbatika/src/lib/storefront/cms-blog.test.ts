import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({
  unstable_cache: (reader: unknown) => reader,
}))
vi.mock("./cms-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("./cms-client")>()
  return { ...original, readCmsJson: vi.fn() }
})

describe("CMS article source reads", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns a stable-ID article in the exact market locale", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({
      kind: "found",
      value: { article: { id: 42, title: "Advice" } },
    })
    const { readCmsArticleById } = await import("./cms-blog")

    await expect(readCmsArticleById("42", "hu-HU")).resolves.toEqual({
      kind: "found",
      value: { id: 42, title: "Advice" },
    })
    expect(readCmsJson).toHaveBeenCalledWith("articles/by-id/42", {
      locale: "hu-HU",
      signal: undefined,
    })
  })

  it("rejects a malformed 200 response rather than treating it as missing", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({
      kind: "found",
      value: { article: { id: " ", title: "Advice" } },
    })
    const { readCmsArticleById } = await import("./cms-blog")

    await expect(readCmsArticleById("42", "sk-SK")).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "INVALID_ARTICLE_ENVELOPE",
    })
  })

  it("rejects an article whose returned stable ID differs from the request", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({
      kind: "found",
      value: { article: { id: 43, title: "Advice" } },
    })
    const { readCmsArticleById } = await import("./cms-blog")

    await expect(readCmsArticleById("42", "sk-SK")).resolves.toEqual({
      kind: "invalid-response",
      causeCode: "MISMATCHED_ARTICLE_ID",
    })
  })

  it("preserves upstream unavailability for the route status mapper", async () => {
    const { readCmsJson } = await import("./cms-client")
    vi.mocked(readCmsJson).mockResolvedValue({
      kind: "unavailable",
      retryAfterSeconds: 11,
    })
    const { readCmsArticleById } = await import("./cms-blog")

    await expect(readCmsArticleById("42", "ro-RO")).resolves.toEqual({
      kind: "unavailable",
      retryAfterSeconds: 11,
    })
  })
})
