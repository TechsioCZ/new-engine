import { asValue } from "@medusajs/framework/awilix"
import {
  ContainerRegistrationKeys,
  createMedusaContainer,
  Modules,
} from "@medusajs/framework/utils"
import { getRecordValue } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { isMeilisearchEnabled } from "../../../../../src/modules/meilisearch/env"
import type { SearchProfile } from "../../../../../src/modules/meilisearch/profiles"
import { loadSearchProfiles } from "../../../../../src/modules/meilisearch/profiles"
import {
  SearchSynchronizationError,
  synchronizeSearchProfiles,
} from "../../../../../src/modules/meilisearch/synchronize"
import { PAYLOAD_MODULE } from "../../../../../src/modules/payload"

const admin = vi.hoisted(() => ({
  addDocuments: vi.fn<(index: string, documents: object[]) => Promise<void>>(),
  deleteDocuments: vi.fn<(index: string, ids: string[]) => Promise<void>>(),
  deleteIndex: vi.fn<(index: string) => Promise<void>>(),
  ensureIndex: vi.fn<(index: string) => Promise<void>>(),
  getDocumentIds: vi.fn<(index: string) => Promise<string[]>>(),
  swapIndexPairs:
    vi.fn<
      (
        pairs: { first: string; second: string }[],
        marker: { documentId: string; index: string },
      ) => Promise<void>
    >(),
  updateSettings: vi.fn<(index: string, settings: unknown) => Promise<void>>(),
}))

const lockState = vi.hoisted(() => ({ contended: false }))

vi.mock(
  import("../../../../../src/modules/meilisearch/admin-client"),
  async (importOriginal) => {
    const { MeilisearchAdminClient } = await importOriginal()

    return {
      MeilisearchAdminClient: class extends MeilisearchAdminClient {
        constructor(options?: { apiKey?: string; host?: string }) {
          super(options ?? { apiKey: "key", host: "http://meili.test" })
        }

        override addDocuments = admin.addDocuments
        override deleteDocuments = admin.deleteDocuments
        override deleteIndex = admin.deleteIndex
        override ensureIndex = admin.ensureIndex
        override getDocumentIds = admin.getDocumentIds
        override swapIndexPairs = admin.swapIndexPairs
        override updateSettings = admin.updateSettings
      },
    }
  },
)

vi.mock(import("../../../../../src/modules/meilisearch/env"), () => ({
  isMeilisearchEnabled: vi.fn<() => boolean>(),
}))

vi.mock(
  import("../../../../../src/modules/meilisearch/profiles"),
  async (importOriginal) => ({
    ...(await importOriginal()),
    loadSearchProfiles: vi.fn<typeof loadSearchProfiles>(),
  }),
)

vi.mock(import("../../../../../src/utils/locking"), () => ({
  executeWithLockTimeout: async <T>(
    _locking: unknown,
    _key: string,
    _timeout: number,
    job: () => Promise<T>,
  ) =>
    lockState.contended
      ? { status: "timed_out" as const }
      : { status: "executed" as const, value: await job() },
}))

const profile = {
  availability: "all",
  domain: "example",
  indexes: {
    brand: "brand_test",
    category: "category_test",
    content: "content_test",
    product: "product_test",
  },
  key: "test",
  limits: {
    autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
    fullSearch: 100,
    page: 20,
    popular: 10,
  },
  locale: "default",
  minimumRankingScore: 0.5,
  salesChannelIds: [],
  separateVariantResults: true,
  shop: "shop",
  strict: false,
} satisfies SearchProfile

type Graph = (options: object) => Promise<unknown>
type ContentList = (options: {
  limit: number
  locale: string
  page: number
}) => Promise<unknown>
type Raw = (query: string, bindings?: unknown[]) => Promise<unknown>

const createContainer = (options: {
  graph: Graph
  payload?: {
    listPublishedArticles: (options: {
      limit: number
      locale: string
      page: number
    }) => Promise<unknown>
    listPublishedPages: (options: {
      limit: number
      locale: string
      page: number
    }) => Promise<unknown>
  }
}) => {
  const logger = {
    debug: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    log: vi.fn<() => void>(),
    progress: vi.fn<() => void>(),
    shouldLog: vi.fn<() => boolean>(() => true),
    success: vi.fn<() => void>(),
    warn: vi.fn<() => void>(),
  }
  const raw = vi.fn<Raw>().mockResolvedValue([])
  const container = createMedusaContainer()

  container.register({
    [ContainerRegistrationKeys.LOGGER]: asValue(logger),
    [ContainerRegistrationKeys.PG_CONNECTION]: asValue({ raw }),
    [ContainerRegistrationKeys.QUERY]: asValue({ graph: options.graph }),
    [Modules.LOCKING]: asValue({}),
    ...(options.payload === undefined
      ? {}
      : { [PAYLOAD_MODULE]: asValue(options.payload) }),
  })

  return { container, logger, raw }
}

const emptyContentPage = {
  docs: [],
  hasNextPage: false,
}

const availablePayload = () => ({
  listPublishedArticles: vi
    .fn<ContentList>()
    .mockResolvedValue(emptyContentPage),
  listPublishedPages: vi.fn<ContentList>().mockResolvedValue(emptyContentPage),
})

const getEntity = (options: object): string | undefined => {
  const entity = getRecordValue(options, "entity")
  return typeof entity === "string" ? entity : undefined
}

describe(synchronizeSearchProfiles, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lockState.contended = false
    vi.mocked(isMeilisearchEnabled).mockReturnValue(true)
    vi.mocked(loadSearchProfiles).mockResolvedValue([profile])
    admin.addDocuments.mockResolvedValue()
    admin.deleteDocuments.mockResolvedValue()
    admin.deleteIndex.mockResolvedValue()
    admin.ensureIndex.mockResolvedValue()
    admin.getDocumentIds.mockResolvedValue([])
    admin.swapIndexPairs.mockResolvedValue()
    admin.updateSettings.mockResolvedValue()
  })

  it("uses variant titles and a deterministic id cursor beyond one product page", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => {
      const suffix = String(index).padStart(4, "0")
      return {
        categories: [],
        id: `product_${suffix}`,
        sales_channels: [],
        status: "published",
        title: `Product ${suffix}`,
        variants: [{ id: `variant_${suffix}`, title: `Variant ${suffix}` }],
      }
    })
    const graph = vi.fn<Graph>().mockImplementation(async (options) => {
      if (getEntity(options) !== "product") {
        throw new Error(`Unexpected graph entity ${getEntity(options)}`)
      }

      const filters = getRecordValue(options, "filters")
      const isNextPage =
        typeof filters === "object" && filters !== null && "id" in filters

      return await Promise.resolve({
        data: isNextPage
          ? [
              {
                categories: [],
                id: "product_0500",
                sales_channels: [],
                status: "published",
                title: "Product 0500",
                variants: [{ id: "variant_0500", title: "Variant 0500" }],
              },
            ]
          : firstPage,
      })
    })
    const { container } = createContainer({
      graph,
      payload: availablePayload(),
    })

    const result = await synchronizeSearchProfiles(container, "normal")

    expect(result).toMatchObject({ indexed: 1002, status: "completed" })
    expect(graph).toHaveBeenCalledTimes(2)

    const firstCall = graph.mock.calls[0]?.[0]
    const secondCall = graph.mock.calls[1]?.[0]

    expect(
      firstCall === undefined ? undefined : getRecordValue(firstCall, "fields"),
    ).toContain("variants.title")
    expect(
      firstCall === undefined
        ? undefined
        : getRecordValue(firstCall, "pagination"),
    ).toStrictEqual({
      order: { id: "ASC" },
      take: 500,
    })
    expect(
      secondCall === undefined
        ? undefined
        : getRecordValue(secondCall, "filters"),
    ).toStrictEqual({
      id: { $gt: "product_0499" },
      status: "published",
    })
  })

  it("fails closed when cursor results are not strictly ordered", async () => {
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          categories: [],
          id: "product_2",
          sales_channels: [],
          status: "published",
          title: "Second",
          variants: [],
        },
        {
          categories: [],
          id: "product_1",
          sales_channels: [],
          status: "published",
          title: "First",
          variants: [],
        },
      ],
    })
    const { container } = createContainer({
      graph,
      payload: availablePayload(),
    })

    await expect(
      synchronizeSearchProfiles(container, "normal"),
    ).rejects.toMatchObject({
      code: "SEARCH_SYNC_DATA_INVALID",
    })
    expect(admin.deleteDocuments).not.toHaveBeenCalled()
  })

  it("fails closed on a malformed graph page without deleting documents", async () => {
    const graph = vi.fn<Graph>().mockResolvedValue({ data: null })
    const { container } = createContainer({
      graph,
      payload: availablePayload(),
    })

    await expect(
      synchronizeSearchProfiles(container, "normal"),
    ).rejects.toMatchObject({
      code: "SEARCH_SYNC_DATA_INVALID",
      name: SearchSynchronizationError.name,
    })
    expect(admin.deleteDocuments).not.toHaveBeenCalled()
    expect(admin.getDocumentIds).not.toHaveBeenCalled()
  })

  it("preserves live content during a normal sync when Payload is unavailable", async () => {
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    admin.getDocumentIds.mockImplementation(
      async (index) =>
        await Promise.resolve(
          index === profile.indexes.content ? ["page_valid"] : [],
        ),
    )
    const { container } = createContainer({ graph })

    const result = await synchronizeSearchProfiles(container, "normal")

    expect(result.status).toBe("completed")
    expect(admin.getDocumentIds).not.toHaveBeenCalledWith(
      profile.indexes.content,
    )
    expect(admin.deleteDocuments).not.toHaveBeenCalledWith(
      profile.indexes.content,
      expect.anything(),
    )
  })

  it("preserves live content when a Payload request fails", async () => {
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    const payload = availablePayload()

    payload.listPublishedPages.mockRejectedValue(
      new Error("Payload connection refused"),
    )
    admin.getDocumentIds.mockImplementation(
      async (index) =>
        await Promise.resolve(
          index === profile.indexes.content ? ["page_valid"] : [],
        ),
    )

    const { container } = createContainer({ graph, payload })
    const result = await synchronizeSearchProfiles(container, "normal")

    expect(result.status).toBe("completed")
    expect(admin.getDocumentIds).not.toHaveBeenCalledWith(
      profile.indexes.content,
    )
    expect(admin.deleteDocuments).not.toHaveBeenCalledWith(
      profile.indexes.content,
      expect.anything(),
    )
  })

  it("does not swap full indexes when Payload is unavailable", async () => {
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    const { container } = createContainer({ graph })

    await expect(
      synchronizeSearchProfiles(container, "full"),
    ).rejects.toMatchObject({ code: "SEARCH_SYNC_SOURCE_UNAVAILABLE" })
    expect(admin.swapIndexPairs).not.toHaveBeenCalled()
    expect(admin.deleteIndex).toHaveBeenCalledTimes(4)
  })

  it("authoritatively deletes stale content when Payload is available and truly empty", async () => {
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    admin.getDocumentIds.mockImplementation(
      async (index) =>
        await Promise.resolve(
          index === profile.indexes.content ? ["page_stale"] : [],
        ),
    )
    const { container } = createContainer({
      graph,
      payload: availablePayload(),
    })

    await synchronizeSearchProfiles(container, "normal")

    expect(admin.deleteDocuments).toHaveBeenCalledWith(
      profile.indexes.content,
      ["page_stale"],
    )
  })

  it("returns a distinguishable result when the sync lock is contended", async () => {
    lockState.contended = true
    const graph = vi.fn<Graph>()
    const { container } = createContainer({ graph })

    const result = await synchronizeSearchProfiles(container, "normal")

    expect(result).toStrictEqual({
      deleted: 0,
      indexed: 0,
      mode: "normal",
      profiles: 0,
      status: "skipped_lock_contended",
    })
    expect(graph).not.toHaveBeenCalled()
  })

  it("fails targeted synchronization when a fresh profile read misses the key", async () => {
    vi.mocked(loadSearchProfiles).mockResolvedValue([])
    const { container } = createContainer({
      graph: vi.fn<Graph>(),
      payload: availablePayload(),
    })

    await expect(
      synchronizeSearchProfiles(container, "normal", {
        profileKeys: ["missing"],
      }),
    ).rejects.toMatchObject({
      code: "SEARCH_SYNC_PROFILE_NOT_FOUND",
    })
    expect(loadSearchProfiles).toHaveBeenCalledWith(container, { fresh: true })
  })
})
