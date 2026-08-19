import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../modules/storefront-url-assignment"
import type { AdminUpsertCollectionUrlAssignment } from "../../../../modules/storefront-url-assignment/contracts"
import type { StorefrontUrlAssignmentRecord } from "../../../../modules/storefront-url-assignment/models/storefront-url-assignment"
import {
  type AdminAssignmentMutationResponse,
  handleAdminAssignmentPOST,
} from "../utils"

const persisted = (
  overrides: Partial<StorefrontUrlAssignmentRecord> = {}
): StorefrontUrlAssignmentRecord =>
  ({
    id: "sfuasn_1",
    schema_version: 1,
    entity_kind: "collection",
    entity_id: "pcol_1",
    market_code: "sk",
    sales_channel_id: "sc_sk",
    public_slug: "old-slug",
    publication_status: "draft",
    source_version: 4,
    ...overrides,
  }) as StorefrontUrlAssignmentRecord

const response = () => {
  const value = {
    status: vi.fn(),
    json: vi.fn((body: unknown) => body),
  }
  value.status.mockReturnValue(value)
  return value
}

const request = (
  assignmentService: Record<string, unknown>,
  body: AdminUpsertCollectionUrlAssignment,
  translations: unknown[] = [
    {
      deleted_at: null,
      id: "trans_1",
      locale_code: "sk-SK",
      reference: "product_collection",
      reference_id: "pcol_1",
      translations: { title: "Zbierka" },
    },
  ]
) =>
  ({
    body,
    params: { id: "pcol_1" },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
          return assignmentService
        }
        if (key === Modules.TRANSLATION) {
          return { listTranslations: vi.fn(async () => translations) }
        }
        return {
          listProductCollections: vi.fn(async () => [{ id: "pcol_1" }]),
          listSalesChannels: vi.fn(async () => [{ id: "sc_sk" }]),
        }
      }),
    },
  }) as unknown as AuthenticatedMedusaRequest<AdminUpsertCollectionUrlAssignment>

describe("admin storefront assignment upsert", () => {
  it("creates a kind-scoped assignment with a server-owned initial version", async () => {
    const created = persisted({ public_slug: "new-slug", source_version: 1 })
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(async () => []),
      createStorefrontUrlAssignments: vi.fn(async () => created),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(assignmentService, {
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicSlug: "new-slug",
        publicationStatus: "draft",
      }),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(
      assignmentService.createStorefrontUrlAssignments
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_kind: "collection",
        entity_id: "pcol_1",
        source_version: 1,
      })
    )
    expect(res.json).toHaveBeenCalledWith({
      assignment: expect.objectContaining({
        id: "pcol_1",
        entityId: "pcol_1",
        sourceVersion: "1",
      }),
      translation: { kind: "unchecked" },
    })
  })

  it("increments the persisted source version only when admin state changes", async () => {
    const existing = persisted()
    const updated = persisted({
      public_slug: "new-slug",
      publication_status: "published",
      source_version: 5,
    })
    const assignmentService = {
      listStorefrontUrlAssignments: vi
        .fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      updateStorefrontUrlAssignments: vi.fn(async () => updated),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(assignmentService, {
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicSlug: "new-slug",
        publicationStatus: "published",
      }),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(
      assignmentService.updateStorefrontUrlAssignments
    ).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sfuasn_1", source_version: 5 })
    )
    expect(res.json).toHaveBeenCalledWith({
      assignment: expect.objectContaining({ sourceVersion: "5" }),
      translation: {
        kind: "found",
        proof: {
          localeCode: "sk-SK",
          reference: "product_collection",
          translationId: "trans_1",
        },
      },
    })
  })

  it("rejects publication when the exact market Translation record is missing", async () => {
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(async () => []),
      createStorefrontUrlAssignments: vi.fn(),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(
        assignmentService,
        {
          marketCode: "sk",
          salesChannelId: "sc_sk",
          publicSlug: "new-slug",
          publicationStatus: "published",
        },
        []
      ),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(res.status).toHaveBeenCalledWith(409)
    expect(
      assignmentService.createStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
  })
})
