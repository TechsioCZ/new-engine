import { beforeEach, describe, expect, it, vi } from "vitest"

import { fetchCmsBlogPost } from "./cms-blog"
import { fetchCmsJson } from "./cms-client"

vi.mock(import("./cms-client"), () => ({
  fetchCmsJson:
    vi.fn<
      (
        path: string,
        params?: Record<string, string | number>,
      ) => Promise<unknown>
    >(),
  resolveCmsMediaUrl: vi.fn<(media: unknown) => string | null>(() => null),
  rewriteCmsHtmlMediaUrls: vi.fn<(html: string) => string>((html) => html),
  stripCmsHtml: vi.fn<(html: string | null | undefined) => string>(
    (html) => html ?? "",
  ),
}))

const fetchCmsJsonMock = vi.mocked(fetchCmsJson)

describe(fetchCmsBlogPost, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses the default topic for an uncategorized article", async () => {
    fetchCmsJsonMock.mockResolvedValue({
      article: {
        category: null,
        id: "article_1",
        slug: "uncategorized-article",
        title: "Uncategorized article",
      },
    })

    await expect(
      fetchCmsBlogPost("uncategorized-article"),
    ).resolves.toStrictEqual(expect.objectContaining({ topic: "zdravie" }))
  })

  it("uses the default topic when an article omits its category", async () => {
    fetchCmsJsonMock.mockResolvedValue({
      article: {
        id: "article_2",
        slug: "category-omitted",
        title: "Category omitted",
      },
    })

    await expect(fetchCmsBlogPost("category-omitted")).resolves.toStrictEqual(
      expect.objectContaining({ topic: "zdravie" }),
    )
  })
})
