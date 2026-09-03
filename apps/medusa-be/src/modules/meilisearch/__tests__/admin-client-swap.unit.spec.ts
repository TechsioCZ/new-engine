import { afterEach, describe, expect, it, vi } from "vitest"
import {
  MeilisearchAdminClient,
  type MeilisearchSwapIndexError,
} from "../admin-client"

const client = () =>
  new MeilisearchAdminClient({
    apiKey: "test-api-key",
    host: "https://meili.example.test",
  })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("Meilisearch atomic swap task authority", () => {
  it("waits for the accepted swap task before probing its marker", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ taskUid: 71 }), { status: 202 })
        )
    )
    const admin = client()
    const callOrder: string[] = []
    vi.spyOn(admin, "waitForTask").mockImplementation(async () => {
      callOrder.push("task")
    })
    vi.spyOn(admin, "waitForDocument").mockImplementation(async () => {
      callOrder.push("marker")
    })

    await admin.swapIndexPairs(
      [{ first: "active_product", second: "build_product" }],
      { documentId: "completion_marker", index: "active_content" }
    )

    expect(callOrder).toEqual(["task", "marker"])
  })

  it("marks an explicit client rejection as definitely not committed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "invalid swap" }), {
          status: 400,
        })
      )
    )

    await expect(
      client().swapIndexPairs([
        { first: "active_product", second: "build_product" },
      ])
    ).rejects.toEqual(
      expect.objectContaining<Partial<MeilisearchSwapIndexError>>({
        definitelyNotCommitted: true,
        name: "MeilisearchSwapIndexError",
      })
    )
  })
})
