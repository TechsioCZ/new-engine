import { describe, expect, it, vi } from "vitest"
import { fetchPopulationSourceExport } from "./population-manifest-source-client"
import { parsePopulationSourceExportPage } from "./population-manifest-source-contracts"

const page = (number: number, pageCount = 2) => ({
  binding: { locale: "ro-RO", salesChannelId: "sc_ro" },
  itemCount: 1,
  items: [
    {
      equivalenceKey: `product:${number}`,
      indexPolicy: "indexable",
      publicSlug: `product-${number}`,
      sourceId: `prod_${number}`,
      sourceVersion: `version_${number}`,
    },
  ],
  kind: "product",
  market: "ro",
  page: number,
  pageCount,
  schemaVersion: 1,
  snapshotId: "snapshot-ro",
})

describe("population source export client", () => {
  it("uses authenticated GET-only pagination without exposing the token in URLs", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => page(1),
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        json: async () => page(2),
        ok: true,
        status: 200,
      })

    const pages = await fetchPopulationSourceExport("ro", "product", {
      baseUrl: "https://population.internal/export/",
      fetchImpl,
      token: "private-token",
    })

    expect(pages).toHaveLength(2)
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://population.internal/export/population-exports/ro/product?page=1",
      {
        headers: { authorization: "Bearer private-token" },
        method: "GET",
      }
    )
    expect(fetchImpl.mock.calls.flat().join(" ")).not.toContain(
      "?token=private-token"
    )
  })

  it("fails closed on pagination and runtime option drift", async () => {
    const outOfOrder = vi.fn().mockResolvedValue({
      json: async () => page(2),
      ok: true,
      status: 200,
    })
    await expect(
      fetchPopulationSourceExport("ro", "product", {
        baseUrl: "https://population.internal",
        fetchImpl: outOfOrder,
        token: "private-token",
      })
    ).rejects.toThrow("out-of-order page")

    await expect(
      fetchPopulationSourceExport("ro", "product", {
        baseUrl: "https://population.internal",
        fetchImpl: outOfOrder,
        maxPages: 0,
        token: "private-token",
      })
    ).rejects.toThrow("maxPages")
  })

  it.each([
    "http://population.internal",
    "https://operator:secret@population.internal",
    "https://population.internal/export?token=embedded",
    "https://population.internal/export#fragment",
  ])("rejects unsafe base URL %s before sending the bearer token", async (baseUrl) => {
    const fetchImpl = vi.fn()
    await expect(
      fetchPopulationSourceExport("ro", "product", {
        baseUrl,
        fetchImpl,
        token: "private-token",
      })
    ).rejects.toThrow("population source baseUrl")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("rejects kind-specific source fields and binding drift", () => {
    expect(() =>
      parsePopulationSourceExportPage(
        {
          ...page(1, 1),
          items: [{ ...page(1, 1).items[0], assignmentId: "unexpected" }],
        },
        { kind: "product", market: "ro" },
        "fixture"
      )
    ).toThrow("invalid fields")
    expect(() =>
      parsePopulationSourceExportPage(
        {
          ...page(1, 1),
          binding: { locale: "sk-SK", salesChannelId: "sc_ro" },
        },
        { kind: "product", market: "ro" },
        "fixture"
      )
    ).toThrow("does not match market ro")
  })
})
