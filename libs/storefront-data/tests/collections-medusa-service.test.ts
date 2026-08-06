import { vi, describe, expect, it } from "vitest"

import { createMedusaCollectionService } from "../src/collections/medusa-service"
import type { MedusaCollectionListInput } from "../src/collections/medusa-service"
import { createTestMedusaSdk } from "./medusa-fixtures"

const createCollection = (id: string, title = "Collection", handle = id) => ({
  handle,
  id,
  title,
})

const createSdkMock = (response: unknown = {}) => {
  const sdk = createTestMedusaSdk()
  const fetch = vi.fn<(path: string, options?: unknown) => Promise<unknown>>()
  fetch.mockResolvedValue(response)
  Object.defineProperty(sdk.client, "fetch", { value: fetch })
  return { fetch, sdk }
}

describe(createMedusaCollectionService, () => {
  it("applies default list fields and forwards signal", async () => {
    const { fetch, sdk } = createSdkMock({
      collections: [createCollection("pcol_1", "Spring 2026", "spring-2026")],
      count: 1,
    })
    const service = createMedusaCollectionService(sdk, {
      defaultListFields: "id,title,handle",
    })
    const controller = new AbortController()

    await service.getCollections(
      { enabled: true, limit: 8, offset: 0 },
      controller.signal,
    )

    expect(fetch).toHaveBeenCalledWith("/store/collections", {
      query: {
        fields: "id,title,handle",
        limit: 8,
        offset: 0,
      },
      signal: controller.signal,
    })
  })

  it("supports custom list query normalization and list transforms", async () => {
    const { fetch, sdk } = createSdkMock({
      collections: [createCollection("pcol_2", "Summer Picks", "summer-picks")],
      count: 1,
    })
    const service = createMedusaCollectionService<
      { id: string; label: string },
      MedusaCollectionListInput & { q?: string }
    >(sdk, {
      normalizeListQuery: ({ q, ...params }) => ({
        ...params,
        search: q,
      }),
      transformDetailCollection: (collection) => ({
        id: collection.id,
        label: collection.title,
      }),
      transformListCollection: (collection) => ({
        id: collection.id,
        label: collection.title,
      }),
    })

    const result = await service.getCollections({
      limit: 10,
      offset: 0,
      q: "summer",
    })

    expect(fetch).toHaveBeenCalledWith("/store/collections", {
      query: {
        limit: 10,
        offset: 0,
        search: "summer",
      },
      signal: null,
    })
    expect(result.collections).toStrictEqual([
      { id: "pcol_2", label: "Summer Picks" },
    ])
    expect(result.count).toBe(1)
  })

  it("returns null and skips fetch when collection id is missing", async () => {
    const { fetch, sdk } = createSdkMock()
    const service = createMedusaCollectionService(sdk)

    const result = await service.getCollection({})

    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("applies default detail fields and supports detail transforms", async () => {
    const { fetch, sdk } = createSdkMock()
    fetch.mockResolvedValueOnce({
      collection: createCollection("pcol_3", "Winter Gear", "winter-gear"),
    })

    const service = createMedusaCollectionService<{
      slug: string
      title: string
    }>(sdk, {
      defaultDetailFields: "id,title,handle,metadata",
      transformDetailCollection: (collection) => ({
        slug: collection.handle,
        title: collection.title,
      }),
      transformListCollection: (collection) => ({
        slug: collection.handle,
        title: collection.title,
      }),
    })

    const result = await service.getCollection({ enabled: true, id: "pcol_3" })

    expect(fetch).toHaveBeenCalledWith("/store/collections/pcol_3", {
      query: {
        fields: "id,title,handle,metadata",
      },
      signal: null,
    })
    expect(result).toStrictEqual({ slug: "winter-gear", title: "Winter Gear" })
  })
})
