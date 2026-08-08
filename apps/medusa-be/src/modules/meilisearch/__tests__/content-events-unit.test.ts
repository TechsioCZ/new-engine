import { describe, expect, it, vi } from "vitest"

import type { MeilisearchAdminClient as AdminClient } from "../admin-client"
import {
  reconcileContentSearchChange,
  selectContentSearchProfiles,
} from "../content-events"
import { buildContentDocumentId } from "../documents"
import type { loadSearchProfiles, SearchProfile } from "../profiles"

const adminClientMocks = vi.hoisted(() => ({
  addDocuments: vi.fn<AdminClient["addDocuments"]>(),
  deleteDocuments: vi.fn<AdminClient["deleteDocuments"]>(),
  ensureIndex: vi.fn<AdminClient["ensureIndex"]>(),
  updateSettings: vi.fn<AdminClient["updateSettings"]>(),
}))
const loadSearchProfilesMock = vi.hoisted(() =>
  vi.fn<typeof loadSearchProfiles>(),
)

vi.mock(import("../admin-client"), async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    MeilisearchAdminClient: class extends original.MeilisearchAdminClient {
      constructor() {
        super({ apiKey: "test-key", host: "http://meilisearch.test" })
      }

      override readonly addDocuments = adminClientMocks.addDocuments
      override readonly deleteDocuments = adminClientMocks.deleteDocuments
      override readonly ensureIndex = adminClientMocks.ensureIndex
      override readonly updateSettings = adminClientMocks.updateSettings
    },
  }
})

vi.mock(import("../env"), () => ({
  isMeilisearchEnabled: () => true,
}))

vi.mock(import("../profiles"), async (importOriginal) => ({
  ...(await importOriginal()),
  loadSearchProfiles: loadSearchProfilesMock,
}))

const profile = (key: string, locale: string): SearchProfile => ({
  availability: "all",
  domain: key,
  indexes: {
    brand: `brand_${key}`,
    category: `category_${key}`,
    content: `content_${key}`,
    product: `product_${key}`,
  },
  key,
  limits: {
    autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
    fullSearch: 500,
    page: 100,
    popular: 12,
  },
  locale,
  minimumRankingScore: 0.55,
  salesChannelIds: ["sc_1"],
  separateVariantResults: false,
  shop: "shop",
  strict: false,
})

describe("CMS content profile selection", () => {
  const profiles = [profile("cs", "cs-CZ"), profile("sk", "sk_SK")]

  it("reconciles a global change across every bounded runtime profile", () => {
    expect(selectContentSearchProfiles(profiles)).toStrictEqual(profiles)
  })

  it("limits a localized content change to the matching language", () => {
    expect(selectContentSearchProfiles(profiles, "sk-SK")).toStrictEqual([
      profiles[1],
    ])
  })

  it("uses the canonical content id when deleting from an index", async () => {
    loadSearchProfilesMock.mockResolvedValue(profiles.slice(0, 1))
    adminClientMocks.ensureIndex.mockResolvedValue()
    adminClientMocks.updateSettings.mockResolvedValue()
    adminClientMocks.deleteDocuments.mockResolvedValue()

    await Reflect.apply(reconcileContentSearchChange, undefined, [
      {
        collection: "pages",
        doc: { id: "page/unsafe", locale: "cs-CZ" },
        operation: "delete",
      },
      { warn: vi.fn<() => void>() },
      {},
    ])

    expect(adminClientMocks.deleteDocuments).toHaveBeenCalledWith(
      "content_cs",
      [buildContentDocumentId("page", "page/unsafe")],
    )
  })
})
