import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  addDocuments: vi.fn(),
  deleteDocuments: vi.fn(),
  ensureIndex: vi.fn(),
  loadSearchProfiles: vi.fn(),
  resolveContentProjectionHrefs: vi.fn(),
  updateSettings: vi.fn(),
}))

vi.mock("../admin-client", () => ({
  MeilisearchAdminClient: class {
    addDocuments = mocks.addDocuments
    deleteDocuments = mocks.deleteDocuments
    ensureIndex = mocks.ensureIndex
    updateSettings = mocks.updateSettings
  },
}))
vi.mock("../env", () => ({ isMeilisearchEnabled: () => true }))
vi.mock("../profiles", () => ({
  loadSearchProfiles: mocks.loadSearchProfiles,
}))
vi.mock("../url-registry-content-projection", () => ({
  contentProjectionKey: (type: string, sourceId: string) =>
    `${type}\u0000${sourceId}`,
  resolveContentProjectionHrefs: mocks.resolveContentProjectionHrefs,
}))

import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { reconcileContentSearchChange } from "../content-events"

const profile = {
  indexes: { content: "content-herbatika-cz" },
  locale: "cs-CZ",
}
const logger = { warn: vi.fn() } as unknown as Logger
const container = {} as MedusaContainer

describe("CMS event URL registry projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadSearchProfiles.mockResolvedValue([profile])
    mocks.ensureIndex.mockResolvedValue(undefined)
    mocks.updateSettings.mockResolvedValue(undefined)
    mocks.addDocuments.mockResolvedValue(undefined)
    mocks.deleteDocuments.mockResolvedValue(undefined)
  })

  it("indexes a published document only with its trusted current href", async () => {
    mocks.resolveContentProjectionHrefs.mockResolvedValue(
      new Map([["article\u000042", "/poradna/bylinky"]])
    )

    await reconcileContentSearchChange(
      {
        collection: "articles",
        doc: {
          id: 42,
          locale: "cs",
          public_href: "https://attacker.invalid/cms-owned",
          slug: "cms-owned",
          status: "published",
          title: "Bylinky",
        },
        operation: "update",
      },
      logger,
      container
    )

    expect(mocks.resolveContentProjectionHrefs).toHaveBeenCalledWith(
      [{ sourceId: "42", sourceType: "article" }],
      "cs-CZ",
      logger
    )
    expect(mocks.addDocuments).toHaveBeenCalledWith("content-herbatika-cz", [
      expect.objectContaining({
        href: "/poradna/bylinky",
        id: "article_42",
        source_id: "42",
      }),
    ])
    expect(mocks.deleteDocuments).not.toHaveBeenCalled()
  })

  it("preserves the last-good document for retry when the trusted projection is absent", async () => {
    mocks.resolveContentProjectionHrefs.mockResolvedValue(new Map())

    await expect(
      reconcileContentSearchChange(
        {
          collection: "pages",
          doc: {
            id: "7",
            locale: "cs-CZ",
            status: "published",
            title: "Doprava",
            visibility: "public",
          },
          operation: "update",
        },
        logger,
        container
      )
    ).rejects.toThrow("canonical public href is unavailable")

    expect(mocks.addDocuments).not.toHaveBeenCalled()
    expect(mocks.deleteDocuments).not.toHaveBeenCalled()
    expect(mocks.ensureIndex).not.toHaveBeenCalled()
    expect(mocks.updateSettings).not.toHaveBeenCalled()
  })

  it("quarantines a missing-locale event instead of broadcasting it", async () => {
    await expect(
      reconcileContentSearchChange(
        {
          collection: "articles",
          doc: { id: "42", status: "published", title: "Bylinky" },
          operation: "update",
        },
        logger,
        container
      )
    ).rejects.toThrow(
      "Quarantining articles search projection because its locale is missing"
    )

    expect(mocks.loadSearchProfiles).not.toHaveBeenCalled()
    expect(mocks.resolveContentProjectionHrefs).not.toHaveBeenCalled()
    expect(mocks.ensureIndex).not.toHaveBeenCalled()
    expect(mocks.addDocuments).not.toHaveBeenCalled()
    expect(mocks.deleteDocuments).not.toHaveBeenCalled()
  })

  it("deletes an explicitly localized unpublished document", async () => {
    await reconcileContentSearchChange(
      {
        collection: "pages",
        doc: {
          id: "7",
          locale: "cs-CZ",
          status: "draft",
          title: "Doprava",
          visibility: "public",
        },
        operation: "update",
      },
      logger,
      container
    )

    expect(mocks.deleteDocuments).toHaveBeenCalledWith("content-herbatika-cz", [
      "page_7",
    ])
  })
})
