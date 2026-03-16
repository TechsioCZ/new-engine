import type { HttpTypes } from "@medusajs/types"
import {
  createMedusaCollectionService,
  type MedusaCollectionDetailInput,
  type MedusaCollectionListInput,
} from "../src/collections/medusa-service"

type SdkLike = {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
}

const createCollection = (
  id: string,
  title = "Collection",
  handle = id
): HttpTypes.StoreCollection =>
  ({ id, title, handle } as HttpTypes.StoreCollection)

function createSdkMock(response?: Partial<HttpTypes.StoreCollectionListResponse>): SdkLike {
  return {
    client: {
      fetch: vi.fn().mockResolvedValue({
        collections: [],
        count: 0,
        limit: 0,
        offset: 0,
        ...response,
      }),
    },
  }
}

describe("createMedusaCollectionService", () => {
  it("applies default list fields and forwards signal", async () => {
    const sdk = createSdkMock({
      collections: [createCollection("pcol_1", "Spring 2026", "spring-2026")],
      count: 1,
    })
    const service = createMedusaCollectionService(sdk as never, {
      defaultListFields: "id,title,handle",
    })
    const controller = new AbortController()

    await service.getCollections(
      { limit: 8, offset: 0, enabled: true },
      controller.signal
    )

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/collections", {
      query: {
        limit: 8,
        offset: 0,
        fields: "id,title,handle",
      },
      signal: controller.signal,
    })
  })

  it("supports custom list query normalization and list transforms", async () => {
    const sdk = createSdkMock({
      collections: [createCollection("pcol_2", "Summer Picks", "summer-picks")],
      count: 1,
    })
    const service = createMedusaCollectionService<
      { id: string; label: string },
      MedusaCollectionListInput & { q?: string }
    >(sdk as never, {
      normalizeListQuery: ({ q, ...params }) => ({
        ...params,
        search: q,
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

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/collections", {
      query: {
        limit: 10,
        offset: 0,
        search: "summer",
      },
      signal: undefined,
    })
    expect(result.collections).toEqual([{ id: "pcol_2", label: "Summer Picks" }])
    expect(result.count).toBe(1)
  })

  it("returns null and skips fetch when collection id is missing", async () => {
    const sdk = createSdkMock()
    const service = createMedusaCollectionService(sdk as never)

    const result = await service.getCollection({})

    expect(result).toBeNull()
    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it("applies default detail fields and supports detail transforms", async () => {
    const sdk = createSdkMock()
    sdk.client.fetch.mockResolvedValueOnce({
      collection: createCollection("pcol_3", "Winter Gear", "winter-gear"),
    } satisfies HttpTypes.StoreCollectionResponse)

    const service = createMedusaCollectionService<
      { slug: string; title: string },
      MedusaCollectionListInput,
      MedusaCollectionDetailInput
    >(sdk as never, {
      defaultDetailFields: "id,title,handle,metadata",
      transformDetailCollection: (collection) => ({
        slug: collection.handle,
        title: collection.title,
      }),
    })

    const result = await service.getCollection({ id: "pcol_3", enabled: true })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/collections/pcol_3", {
      query: {
        fields: "id,title,handle,metadata",
      },
      signal: undefined,
    })
    expect(result).toEqual({ slug: "winter-gear", title: "Winter Gear" })
  })
})
