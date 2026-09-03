import { describe, expect, it, vi } from "vitest"
import {
  type CatalogPublicationProofDependencies,
  type CatalogPublicationProofRequest,
  readCatalogPublicationProof,
} from "./catalog-publication-proof"

const binding = {
  locale: "cs-CZ",
  market: "cz",
  salesChannelId: "sc_cz",
} as const

const request: CatalogPublicationProofRequest = {
  entityId: "category_1",
  entityKind: "category",
  market: "cz",
  publicSlug: "vitaminy",
  sourceVersion: "7",
}

const assignment = (overrides: Record<string, unknown> = {}) => ({
  entityId: "category_1",
  id: "category_1",
  marketCode: "cz",
  publicationStatus: "published",
  publicSlug: "vitaminy",
  salesChannelId: "sc_cz",
  schemaVersion: 1,
  sourceVersion: "7",
  translation: {
    localeCode: "cs-CZ",
    reference: "product_category",
    translationId: "translation_1",
  },
  ...overrides,
})

const response = (assignments: readonly unknown[] = [assignment()]) => ({
  assignments,
  entityKind: "category",
  marketCode: "cz",
  schemaVersion: 1,
})

const dependencies = (
  payload: unknown
): CatalogPublicationProofDependencies => ({
  resolveMarket: vi.fn(() => binding),
  retrieveAssignments: vi.fn().mockResolvedValue(payload),
})

describe("readCatalogPublicationProof", () => {
  it("accepts only the exact market assignment and exact-locale Translation proof", async () => {
    await expect(
      readCatalogPublicationProof(request, dependencies(response()))
    ).resolves.toEqual({
      kind: "found",
      value: {
        entityId: "category_1",
        entityKind: "category",
        marketCode: "cz",
        publicSlug: "vitaminy",
        sourceVersion: "7",
        translationId: "translation_1",
      },
    })
  })

  it.each([
    ["market", { marketCode: "sk" }],
    ["sales channel", { salesChannelId: "sc_sk" }],
    ["slug", { publicSlug: "vitaminy-old" }],
    ["source version", { sourceVersion: "6" }],
    [
      "locale",
      {
        translation: {
          localeCode: "sk-SK",
          reference: "product_category",
          translationId: "translation_1",
        },
      },
    ],
    [
      "reference",
      {
        translation: {
          localeCode: "cs-CZ",
          reference: "product",
          translationId: "translation_1",
        },
      },
    ],
    [
      "translation identity",
      {
        translation: {
          localeCode: "cs-CZ",
          reference: "product_category",
          translationId: 123,
        },
      },
    ],
  ])("rejects a wrong %s proof", async (_label, override) => {
    await expect(
      readCatalogPublicationProof(
        request,
        dependencies(response([assignment(override)]))
      )
    ).resolves.toEqual({
      causeCode: "CATALOG_PUBLICATION_PROOF_MISMATCH",
      kind: "invalid-response",
    })
  })

  it("maps an omitted assignment to missing and duplicate assignments to invalid", async () => {
    await expect(
      readCatalogPublicationProof(request, dependencies(response([])))
    ).resolves.toEqual({ kind: "missing" })
    await expect(
      readCatalogPublicationProof(
        request,
        dependencies(response([assignment(), assignment()]))
      )
    ).resolves.toEqual({
      causeCode: "DUPLICATE_CATALOG_PUBLICATION_ASSIGNMENT",
      kind: "invalid-response",
    })
  })

  it.each([
    [404, { kind: "missing" }],
    [503, { kind: "unavailable" }],
    [
      400,
      {
        causeCode: "MEDUSA_REJECTED_CATALOG_PUBLICATION_REQUEST",
        kind: "invalid-response",
      },
    ],
  ])("maps HTTP %s without accepting an unproven entity", async (status, expected) => {
    await expect(
      readCatalogPublicationProof(request, {
        resolveMarket: vi.fn(() => binding),
        retrieveAssignments: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error("request failed"), { status })
          ),
      })
    ).resolves.toEqual(expected)
  })
})
