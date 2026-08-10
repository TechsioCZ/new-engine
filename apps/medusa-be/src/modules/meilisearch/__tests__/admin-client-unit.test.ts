import { afterEach, describe, expect, it, vi } from "vitest"

import { MeilisearchAdminClient } from "../admin-client"
import { MeilisearchError } from "../http-error"

const jsonResponse = (body: unknown, status: number): Response =>
  Response.json(body, { status })

const client = (): MeilisearchAdminClient =>
  new MeilisearchAdminClient({ apiKey: "key", host: "http://meili.test" })

describe("Meilisearch mutation tasks", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects a successful mutation response without a valid task", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ status: "enqueued" }, 202))
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      client().addDocuments("products", [{ id: "prod_1" }]),
    ).rejects.toMatchObject({
      code: "MEILISEARCH_TASK_RESPONSE_INVALID",
      name: "MeilisearchError",
    })
  })

  it("observes swap task failure before probing the swapped index", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ status: "enqueued", taskUid: 7 }, 202),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { message: "swap failed" }, status: "failed", uid: 7 },
          200,
        ),
      )
    vi.stubGlobal("fetch", fetchMock)

    const operation = client().swapIndexPairs(
      [{ first: "products_next", second: "products" }],
      { documentId: "probe", index: "products" },
    )

    await expect(operation).rejects.toBeInstanceOf(MeilisearchError)
    await expect(operation).rejects.toMatchObject({
      code: "MEILISEARCH_TASK_FAILED",
      taskUid: 7,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("rejects malformed document enumeration pages", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ results: [{ title: "missing id" }] }, 200),
      )
    vi.stubGlobal("fetch", fetchMock)

    await expect(client().getDocumentIds("products")).rejects.toThrow(
      "without an id",
    )
  })
})
