import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  addDocuments: vi.fn(),
  deleteDocuments: vi.fn(),
  ensureIndex: vi.fn(),
  loadSearchProfiles: vi.fn(),
  readUrlRegistryContentProjectionConfig: vi.fn(),
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
  readUrlRegistryContentProjectionConfig:
    mocks.readUrlRegistryContentProjectionConfig,
  resolveContentProjectionHrefs: mocks.resolveContentProjectionHrefs,
}))

import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { reconcileContentSearchChange } from "../content-events"

const profile = {
  indexes: { content: "content-herbatika-cz" },
  locale: "cs-CZ",
}
const skProfile = {
  indexes: { content: "content-herbatika-sk" },
  locale: "sk-SK",
}
const logger = { warn: vi.fn() } as unknown as Logger
const container = {} as MedusaContainer

describe("CMS event URL registry projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.readUrlRegistryContentProjectionConfig.mockReturnValue({
      token: "x".repeat(48),
      url: new URL("http://storefront.internal/api/content-projections"),
    })
    mocks.loadSearchProfiles.mockResolvedValue([profile])
    mocks.ensureIndex.mockResolvedValue(undefined)
    mocks.updateSettings.mockResolvedValue(undefined)
    mocks.addDocuments.mockResolvedValue(undefined)
    mocks.deleteDocuments.mockResolvedValue(undefined)
  })

  it("indexes a published document only with its trusted current href", async () => {
    mocks.resolveContentProjectionHrefs.mockResolvedValue(
      new Map([["article\u000042", "/blog/bylinky"]])
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
        href: "/blog/bylinky",
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
    ).rejects.toMatchObject({
      message: expect.stringContaining("canonical public href is unavailable"),
      type: MedusaError.Types.UNEXPECTED_STATE,
    })

    expect(mocks.addDocuments).not.toHaveBeenCalled()
    expect(mocks.deleteDocuments).not.toHaveBeenCalled()
    expect(mocks.ensureIndex).not.toHaveBeenCalled()
    expect(mocks.updateSettings).not.toHaveBeenCalled()
  })

  it("skips the search projection when the feature flag is disabled", async () => {
    mocks.readUrlRegistryContentProjectionConfig.mockReturnValue(null)

    await reconcileContentSearchChange(
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

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("URL_REGISTRY_CONTENT_PROJECTION_ENABLED")
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("full content resync")
    )
    expect(mocks.resolveContentProjectionHrefs).not.toHaveBeenCalled()
    expect(mocks.addDocuments).not.toHaveBeenCalled()
    expect(mocks.deleteDocuments).not.toHaveBeenCalled()
  })

  it("still deletes unpublished documents while the projection is disabled", async () => {
    mocks.readUrlRegistryContentProjectionConfig.mockReturnValue(null)

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

  it("keeps failing loudly when the projection is enabled but misconfigured", async () => {
    mocks.readUrlRegistryContentProjectionConfig.mockImplementation(() => {
      throw new Error(
        "URL registry content projection is enabled but misconfigured"
      )
    })
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
    ).rejects.toMatchObject({
      message: expect.stringContaining("canonical public href is unavailable"),
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
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
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        "Quarantining articles search projection because its locale is missing"
      ),
      type: MedusaError.Types.UNEXPECTED_STATE,
    })

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

  it("deletes a locale-less document from every content profile", async () => {
    mocks.loadSearchProfiles.mockResolvedValue([profile, skProfile])

    await reconcileContentSearchChange(
      {
        collection: "articles",
        doc: { id: "42", status: "published", title: "Bylinky" },
        operation: "delete",
      },
      logger,
      container
    )

    expect(mocks.deleteDocuments).toHaveBeenCalledTimes(2)
    expect(mocks.deleteDocuments).toHaveBeenCalledWith("content-herbatika-cz", [
      "article_42",
    ])
    expect(mocks.deleteDocuments).toHaveBeenCalledWith("content-herbatika-sk", [
      "article_42",
    ])
    expect(mocks.resolveContentProjectionHrefs).not.toHaveBeenCalled()
    expect(mocks.addDocuments).not.toHaveBeenCalled()
  })
})
