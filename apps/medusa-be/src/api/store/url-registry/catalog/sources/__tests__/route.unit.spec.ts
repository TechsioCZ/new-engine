import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import { beforeEach, describe, expect, it, vi } from "vitest"

const readPublishedStorefrontAssignmentSources = vi.hoisted(() => vi.fn())

vi.mock("../../../utils", async () => {
  const actual =
    await vi.importActual<typeof import("../../../utils")>("../../../utils")

  return {
    ...actual,
    readPublishedStorefrontAssignmentSources,
  }
})

import { POST } from "../route"

const makeRequest = (body: unknown) =>
  ({
    body,
    scope: { resolve: vi.fn() },
  }) as unknown as MedusaStoreRequest

const makeResponse = () => {
  const json = vi.fn()
  const status = vi.fn().mockReturnThis()
  const response = { json, status } as unknown as MedusaResponse

  return { json, response, status }
}

describe("catalog source batch route", () => {
  beforeEach(() => {
    readPublishedStorefrontAssignmentSources.mockReset()
  })

  it.each([
    ["category", "pcat_1", "doplnky", "product_category"],
    ["brand", "brand_1", "herbatika", "brand"],
    ["collection", "pcol_1", "zimna-kolekcia", "product_collection"],
  ] as const)("returns the exact successful %s response", async (entityKind, entityId, publicSlug, translationReference) => {
    const candidate = { entityId, publicSlug, sourceVersion: "1" }
    const assignment = {
      entityId,
      id: entityId,
      marketCode: "sk",
      publicationStatus: "published",
      publicSlug,
      salesChannelId: "sc_sk",
      schemaVersion: 1,
      sourceVersion: "1",
      translation: {
        localeCode: "sk-SK",
        reference: translationReference,
        translationId: `trans_${entityId}`,
      },
    }
    readPublishedStorefrontAssignmentSources.mockResolvedValueOnce({
      assignments: [assignment],
      kind: "found",
    })
    const request = makeRequest({
      candidates: [candidate],
      entityKind,
      market: "sk",
      schemaVersion: 1,
    })
    const { json, response, status } = makeResponse()

    await POST(request, response)

    expect(readPublishedStorefrontAssignmentSources).toHaveBeenCalledOnce()
    expect(readPublishedStorefrontAssignmentSources).toHaveBeenCalledWith(
      request,
      entityKind,
      "sk",
      [candidate]
    )
    expect(status).not.toHaveBeenCalled()
    expect(json).toHaveBeenCalledOnce()
    expect(json).toHaveBeenCalledWith({
      assignments: [assignment],
      entityKind,
      marketCode: "sk",
      schemaVersion: 1,
    })
  })

  it.each([
    ["an extra top-level field", { extra: true }],
    [
      "an extra candidate field",
      {
        candidates: [
          {
            entityId: "pcat_1",
            extra: true,
            publicSlug: "doplnky",
            sourceVersion: "1",
          },
        ],
      },
    ],
  ])("rejects %s with an exact 400 response", async (_label, overrides) => {
    const request = makeRequest({
      candidates: [
        { entityId: "pcat_1", publicSlug: "doplnky", sourceVersion: "1" },
      ],
      entityKind: "category",
      market: "sk",
      schemaVersion: 1,
      ...overrides,
    })
    const { json, response, status } = makeResponse()

    await POST(request, response)

    expect(readPublishedStorefrontAssignmentSources).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledOnce()
    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledOnce()
    expect(json).toHaveBeenCalledWith({ message: "Invalid request" })
  })

  it("accepts a customer-authoritative candidate slug with consecutive hyphens", async () => {
    const candidate = {
      entityId: "pcol_1",
      publicSlug: "zimna--kolekcia",
      sourceVersion: "1",
    }
    const assignment = {
      entityId: "pcol_1",
      id: "pcol_1",
      marketCode: "sk",
      publicationStatus: "published",
      publicSlug: "zimna--kolekcia",
      salesChannelId: "sc_sk",
      schemaVersion: 1,
      sourceVersion: "1",
      translation: {
        localeCode: "sk-SK",
        reference: "product_collection",
        translationId: "trans_pcol_1",
      },
    }
    readPublishedStorefrontAssignmentSources.mockResolvedValueOnce({
      assignments: [assignment],
      kind: "found",
    })
    const request = makeRequest({
      candidates: [candidate],
      entityKind: "collection",
      market: "sk",
      schemaVersion: 1,
    })
    const { json, response, status } = makeResponse()

    await POST(request, response)

    expect(readPublishedStorefrontAssignmentSources).toHaveBeenCalledOnce()
    expect(status).not.toHaveBeenCalled()
    expect(json).toHaveBeenCalledOnce()
    expect(json).toHaveBeenCalledWith({
      assignments: [assignment],
      entityKind: "collection",
      marketCode: "sk",
      schemaVersion: 1,
    })
  })

  it("maps unavailable catalog reads to an exact 503 response", async () => {
    readPublishedStorefrontAssignmentSources.mockResolvedValueOnce({
      kind: "unavailable",
    })
    const request = makeRequest({
      candidates: [
        { entityId: "pcat_1", publicSlug: "doplnky", sourceVersion: "1" },
      ],
      entityKind: "category",
      market: "sk",
      schemaVersion: 1,
    })
    const { json, response, status } = makeResponse()

    await POST(request, response)

    expect(readPublishedStorefrontAssignmentSources).toHaveBeenCalledOnce()
    expect(status).toHaveBeenCalledOnce()
    expect(status).toHaveBeenCalledWith(503)
    expect(json).toHaveBeenCalledOnce()
    expect(json).toHaveBeenCalledWith({
      message: "Catalog availability is temporarily unavailable",
    })
  })
})
