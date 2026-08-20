import type { MedusaStoreRequest } from "@medusajs/framework/http"
import type { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../modules/storefront-url-assignment"
import {
  assertSingleAssignmentMarket,
  type CollectionUrlAssignmentResponse,
  InvalidCollectionUrlAssignmentError,
  resolvePublishableKeySalesChannelId,
  type StorefrontUrlAssignmentEntityKind,
  serializeStorefrontUrlAssignment,
} from "../../../modules/storefront-url-assignment/contracts"
import type StorefrontUrlAssignmentModuleService from "../../../modules/storefront-url-assignment/service"
import {
  type CatalogMarket,
  type CatalogTranslationProof,
  readExactCatalogTranslation,
  readExactCatalogTranslations,
} from "../../../utils/catalog-translation"

export type PublishedStorefrontAssignment = CollectionUrlAssignmentResponse &
  Readonly<{ translation: CatalogTranslationProof }>

export type StorefrontAssignmentRead =
  | { kind: "found"; assignment: PublishedStorefrontAssignment }
  | { kind: "missing" }
  | { kind: "unavailable" }

const resolveService = (request: MedusaStoreRequest) =>
  request.scope.resolve<StorefrontUrlAssignmentModuleService>(
    STOREFRONT_URL_ASSIGNMENT_MODULE
  )

const resolveSalesChannelId = (request: MedusaStoreRequest) =>
  resolvePublishableKeySalesChannelId(
    request.publishable_key_context?.sales_channel_ids
  )

const sourceEntityExists = async (
  request: MedusaStoreRequest,
  entityKind: StorefrontUrlAssignmentEntityKind,
  entityId: string
): Promise<boolean> => {
  if (entityKind === "brand") {
    const records = await request.scope
      .resolve<BrandModuleService>(BRAND_MODULE)
      .listBrands({ id: entityId }, { select: ["id"], take: 1 })
    return records.length === 1
  }

  const productService = request.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const records =
    entityKind === "category"
      ? await productService.listProductCategories(
          { id: entityId },
          { select: ["id"], take: 1 }
        )
      : await productService.listProductCollections(
          { id: entityId },
          { select: ["id"], take: 1 }
        )
  return records.length === 1
}

const sourceEntitiesExist = async (
  request: MedusaStoreRequest,
  entityKind: StorefrontUrlAssignmentEntityKind,
  entityIds: string[]
): Promise<boolean> => {
  if (entityIds.length === 0) {
    return true
  }

  const uniqueIds = [...new Set(entityIds)]
  if (entityKind === "brand") {
    const records = await request.scope
      .resolve<BrandModuleService>(BRAND_MODULE)
      .listBrands({ id: uniqueIds }, { select: ["id"], take: uniqueIds.length })
    const foundIds = new Set(records.map((record) => record.id))
    return uniqueIds.every((id) => foundIds.has(id))
  }

  const productService = request.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const records =
    entityKind === "category"
      ? await productService.listProductCategories(
          { id: uniqueIds },
          { select: ["id"], take: uniqueIds.length }
        )
      : await productService.listProductCollections(
          { id: uniqueIds },
          { select: ["id"], take: uniqueIds.length }
        )
  const foundIds = new Set(records.map((record) => record.id))
  return uniqueIds.every((id) => foundIds.has(id))
}

export const readPublishedStorefrontAssignment = async (
  request: MedusaStoreRequest,
  entityKind: StorefrontUrlAssignmentEntityKind,
  entityId: string
): Promise<StorefrontAssignmentRead> => {
  try {
    const salesChannelId = resolveSalesChannelId(request)
    const [records, sourceExists] = await Promise.all([
      resolveService(request).listStorefrontUrlAssignments(
        {
          entity_kind: entityKind,
          entity_id: entityId,
          publication_status: "published",
          sales_channel_id: salesChannelId,
        },
        { take: 2, order: { market_code: "ASC" } }
      ),
      sourceEntityExists(request, entityKind, entityId),
    ])

    const [record] = records
    if (!(record && sourceExists)) {
      return { kind: "missing" }
    }
    if (records.length !== 1) {
      return { kind: "unavailable" }
    }

    const assignment = serializeStorefrontUrlAssignment(record, entityKind)
    if (
      assignment.entityId !== entityId ||
      assignment.salesChannelId !== salesChannelId ||
      assignment.publicationStatus !== "published"
    ) {
      return { kind: "unavailable" }
    }

    const translation = await readExactCatalogTranslation({
      container: request.scope,
      entityId,
      entityKind,
      market: assignment.marketCode,
    })
    if (translation.kind === "missing") {
      return { kind: "missing" }
    }
    if (translation.kind !== "found") {
      return { kind: "unavailable" }
    }

    return {
      kind: "found",
      assignment: { ...assignment, translation: translation.proof },
    }
  } catch {
    return { kind: "unavailable" }
  }
}

export type StorefrontAssignmentPage = {
  items: PublishedStorefrontAssignment[]
  count: number
  limit: number
  offset: number
}

export const STOREFRONT_ASSIGNMENT_SOURCE_BATCH_LIMIT = 100

export type StorefrontAssignmentSourceCandidate = Readonly<{
  entityId: string
  publicSlug: string
  sourceVersion: string
}>

export type StorefrontAssignmentSourceBatchRead =
  | Readonly<{
      assignments: readonly PublishedStorefrontAssignment[]
      kind: "found"
    }>
  | Readonly<{ kind: "unavailable" }>

export const readPublishedStorefrontAssignmentSources = async (
  request: MedusaStoreRequest,
  entityKind: StorefrontUrlAssignmentEntityKind,
  market: CatalogMarket,
  candidates: readonly StorefrontAssignmentSourceCandidate[]
): Promise<StorefrontAssignmentSourceBatchRead> => {
  if (
    candidates.length < 1 ||
    candidates.length > STOREFRONT_ASSIGNMENT_SOURCE_BATCH_LIMIT ||
    new Set(candidates.map((candidate) => candidate.entityId)).size !==
      candidates.length ||
    new Set(candidates.map((candidate) => candidate.publicSlug)).size !==
      candidates.length
  ) {
    return { kind: "unavailable" }
  }

  try {
    const salesChannelId = resolveSalesChannelId(request)
    const candidateByEntityId = new Map(
      candidates.map((candidate) => [candidate.entityId, candidate])
    )
    const records = await resolveService(request).listStorefrontUrlAssignments(
      {
        entity_id: candidates.map((candidate) => candidate.entityId),
        entity_kind: entityKind,
        market_code: market,
        publication_status: "published",
        sales_channel_id: salesChannelId,
      },
      {
        order: { entity_id: "ASC" },
        take: candidates.length + 1,
      }
    )
    const serialized = records.map((record) =>
      serializeStorefrontUrlAssignment(record, entityKind)
    )
    if (
      serialized.length > candidates.length ||
      new Set(serialized.map((assignment) => assignment.entityId)).size !==
        serialized.length ||
      serialized.some(
        (assignment) =>
          !candidateByEntityId.has(assignment.entityId) ||
          assignment.marketCode !== market ||
          assignment.salesChannelId !== salesChannelId ||
          assignment.publicationStatus !== "published"
      )
    ) {
      return { kind: "unavailable" }
    }

    const matching = serialized.filter((assignment) => {
      const candidate = candidateByEntityId.get(assignment.entityId)
      return (
        candidate?.publicSlug === assignment.publicSlug &&
        candidate.sourceVersion === assignment.sourceVersion
      )
    })
    if (matching.length === 0) {
      return { assignments: [], kind: "found" }
    }
    if (
      !(await sourceEntitiesExist(
        request,
        entityKind,
        matching.map((assignment) => assignment.entityId)
      ))
    ) {
      return { kind: "unavailable" }
    }

    const translations = await readExactCatalogTranslations({
      container: request.scope,
      entityIds: matching.map((assignment) => assignment.entityId),
      entityKind,
      market,
    })
    if (
      translations.kind !== "found" ||
      translations.missingEntityIds.length > 0
    ) {
      return { kind: "unavailable" }
    }

    const assignmentByEntityId = new Map(
      matching.map((assignment) => [assignment.entityId, assignment])
    )
    const assignments: PublishedStorefrontAssignment[] = []
    for (const candidate of candidates) {
      const assignment = assignmentByEntityId.get(candidate.entityId)
      if (!assignment) {
        continue
      }
      const translation = translations.proofsByEntityId.get(candidate.entityId)
      if (!translation) {
        return { kind: "unavailable" }
      }
      assignments.push({ ...assignment, translation })
    }
    return { assignments, kind: "found" }
  } catch {
    return { kind: "unavailable" }
  }
}

export const readPublishedStorefrontAssignmentPage = async (
  request: MedusaStoreRequest,
  entityKind: StorefrontUrlAssignmentEntityKind,
  page: { limit: number; offset: number }
): Promise<
  { kind: "found"; page: StorefrontAssignmentPage } | { kind: "unavailable" }
> => {
  try {
    const salesChannelId = resolveSalesChannelId(request)
    const [records, count] = await resolveService(
      request
    ).listAndCountStorefrontUrlAssignments(
      {
        entity_kind: entityKind,
        publication_status: "published",
        sales_channel_id: salesChannelId,
      },
      {
        order: { entity_id: "ASC", market_code: "ASC" },
        skip: page.offset,
        take: page.limit,
      }
    )
    const items = records.map((record) =>
      serializeStorefrontUrlAssignment(record, entityKind)
    )
    assertSingleAssignmentMarket(items)

    if (
      !(await sourceEntitiesExist(
        request,
        entityKind,
        items.map((assignment) => assignment.entityId)
      ))
    ) {
      throw new InvalidCollectionUrlAssignmentError(
        "Assignment page references a missing source entity"
      )
    }

    if (
      items.some(
        (assignment) =>
          assignment.salesChannelId !== salesChannelId ||
          assignment.publicationStatus !== "published"
      )
    ) {
      throw new InvalidCollectionUrlAssignmentError(
        "Assignment query returned a record outside the requested channel"
      )
    }

    const market = items[0]?.marketCode
    if (!market) {
      return {
        kind: "found",
        page: { items: [], count, limit: page.limit, offset: page.offset },
      }
    }
    const translations = await readExactCatalogTranslations({
      container: request.scope,
      entityIds: items.map((assignment) => assignment.entityId),
      entityKind,
      market,
    })
    if (translations.kind !== "found") {
      throw new InvalidCollectionUrlAssignmentError(
        "Catalog translations are unavailable or invalid"
      )
    }
    if (translations.missingEntityIds.length > 0) {
      throw new InvalidCollectionUrlAssignmentError(
        "Published assignment page contains an untranslated source entity"
      )
    }
    const translatedItems = items.map((assignment) => {
      const translation = translations.proofsByEntityId.get(assignment.entityId)
      if (!translation) {
        throw new InvalidCollectionUrlAssignmentError(
          "Published assignment page is missing a Translation proof"
        )
      }
      return { ...assignment, translation }
    })

    return {
      kind: "found",
      page: {
        items: translatedItems,
        count,
        limit: page.limit,
        offset: page.offset,
      },
    }
  } catch {
    return { kind: "unavailable" }
  }
}
