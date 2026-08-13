import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("payload", () => ({
  APIError: class APIError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
  headersWithCors: vi.fn(({ headers }: { headers: Headers }) => headers),
}))

import { articleOptionsEndpoint } from "@/lib/endpoints/article-options"

const createRequest = () => ({
  headers: new Headers(),
  payload: {
    config: { localization: { localeCodes: ["cs", "sk"] } },
    find: vi.fn(),
  },
  url: "http://localhost/api/article-options?locale=sk&search=olej&limit=10",
  user: { id: 1 },
})

describe("article options endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns localized published articles for the admin picker", async () => {
    const req = createRequest()
    req.payload.find.mockResolvedValue({
      docs: [
        {
          id: 1,
          slug: "pestrecovy-olej",
          title: "Pestrecový olej",
          featuredImage: { url: "/media/pestrec.webp" },
        },
        { id: 2, slug: " ", title: "Invalid" },
      ],
    })

    const response = await articleOptionsEndpoint.handler(req as never)

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "articles",
        fallbackLocale: false,
        limit: 10,
        locale: "sk",
        req,
        where: {
          and: [
            { status: { equals: "published" } },
            {
              or: [
                { title: { like: "olej" } },
                { slug: { like: "olej" } },
              ],
            },
          ],
        },
      })
    )
    await expect(response.json()).resolves.toEqual({
      articles: [
        {
          id: 1,
          slug: "pestrecovy-olej",
          title: "Pestrecový olej",
          thumbnail: "/media/pestrec.webp",
        },
      ],
    })
  })

  it("rejects unauthenticated requests", async () => {
    const req = { ...createRequest(), user: undefined }

    await expect(
      articleOptionsEndpoint.handler(req as never)
    ).rejects.toMatchObject({ message: "Unauthorized", status: 401 })
  })
})
