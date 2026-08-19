import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import type { IProductModuleService } from "@medusajs/framework/types"
import { MedusaError, Modules, ProductStatus } from "@medusajs/framework/utils"
import { PAYLOAD_MODULE } from "../../../modules/payload"
import type PayloadModuleService from "../../../modules/payload/service"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../modules/storefront-url-assignment"
import {
  type StorefrontUrlAssignmentEntityKind,
  serializeStorefrontUrlAssignment,
} from "../../../modules/storefront-url-assignment/contracts"
import type StorefrontUrlAssignmentModuleService from "../../../modules/storefront-url-assignment/service"
import { parseProductPublicationSnapshot } from "../../../modules/url-registry-outbox/product-publication-assignment"
import {
  readExactCatalogTranslations,
  resolveCatalogMarketLocale,
} from "../../../utils/catalog-translation"
import type {
  CatalogPopulationSourceItem,
  CmsPopulationSourceItem,
  PopulationSourceQuery,
  PopulationSourceRead,
} from "./population-source-contracts"
import { createPopulationSourcePage } from "./population-source-page"
import { sourceEntityExists } from "./utils"

const readAssignedCatalogPage = async (
  request: AuthenticatedMedusaRequest,
  query: PopulationSourceQuery,
  entityKind: StorefrontUrlAssignmentEntityKind
): Promise<PopulationSourceRead> => {
  const service = request.scope.resolve<StorefrontUrlAssignmentModuleService>(
    STOREFRONT_URL_ASSIGNMENT_MODULE
  )
  const [records, count] = await service.listAndCountStorefrontUrlAssignments(
    {
      entity_kind: entityKind,
      market_code: query.market,
      publication_status: "published",
    },
    {
      order: { entity_id: "ASC" },
      skip: query.offset,
      take: query.limit,
    }
  )
  const productService = request.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const assignments = records.map((record) =>
    serializeStorefrontUrlAssignment(record, entityKind)
  )
  if (
    assignments.some(
      (assignment) =>
        assignment.marketCode !== query.market ||
        assignment.publicationStatus !== "published"
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Assignment query returned out-of-scope state"
    )
  }
  const exists = await Promise.all(
    assignments.map(({ entityId }) =>
      sourceEntityExists(request, productService, entityKind, entityId)
    )
  )
  if (exists.some((value) => !value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Published assignment references a missing source entity"
    )
  }
  const translations = await readExactCatalogTranslations({
    container: request.scope,
    entityIds: assignments.map(({ entityId }) => entityId),
    entityKind,
    market: query.market,
  })
  if (translations.kind !== "found" || translations.missingEntityIds.length) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Published assignment lacks exact Translation proof"
    )
  }
  const items = assignments.map(
    (assignment, index): CatalogPopulationSourceItem => {
      const translation = translations.proofsByEntityId.get(assignment.entityId)
      const assignmentRecord = records[index]
      if (!(translation && assignmentRecord)) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Published assignment Translation proof is ambiguous"
        )
      }
      return {
        assignmentId: assignmentRecord.id,
        authorityKind: "medusa-published-assignment",
        market: query.market,
        publicSlug: assignment.publicSlug,
        salesChannelId: assignment.salesChannelId,
        sourceId: assignment.entityId,
        sourceVersion: assignment.sourceVersion,
        translation,
      }
    }
  )
  return createPopulationSourcePage(query, items, count, records.length)
}

type ProductSourceRecord = Readonly<{
  id: string
  metadata?: unknown
  sales_channels?: unknown
  updated_at: Date | string
}>

const readProductPage = async (
  request: AuthenticatedMedusaRequest,
  query: PopulationSourceQuery
): Promise<PopulationSourceRead> => {
  const productService = request.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const [rawProducts, count] = await productService.listAndCountProducts(
    { status: ProductStatus.PUBLISHED },
    {
      order: { id: "ASC" },
      relations: ["sales_channels"],
      select: ["id", "metadata", "updated_at"],
      skip: query.offset,
      take: query.limit,
    }
  )
  const products = rawProducts as ProductSourceRecord[]
  const sources = products.flatMap((product) => {
    const snapshot = parseProductPublicationSnapshot(product)
    const assignment = snapshot.assignments[query.market]
    return assignment?.publicationStatus === "published"
      ? [{ assignment, snapshot }]
      : []
  })
  const translations = await readExactCatalogTranslations({
    container: request.scope,
    entityIds: sources.map(({ snapshot }) => snapshot.productId),
    entityKind: "product",
    market: query.market,
  })
  if (translations.kind !== "found" || translations.missingEntityIds.length) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Published product lacks exact Translation proof"
    )
  }
  const items = sources.map(({ assignment, snapshot }) => {
    const translation = translations.proofsByEntityId.get(snapshot.productId)
    if (!translation) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Published product Translation proof is ambiguous"
      )
    }
    return {
      authorityKind: "medusa-product-publication" as const,
      market: query.market,
      publicSlug: assignment.publicSlug,
      salesChannelId: assignment.salesChannelId,
      sourceId: snapshot.productId,
      sourceVersion: snapshot.sourceVersion,
      translation,
    }
  })
  return createPopulationSourcePage(query, items, count, products.length)
}

const sourceTimestamp = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Payload document updatedAt is missing"
    )
  }
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Payload document updatedAt is invalid"
    )
  }
  return timestamp.toISOString()
}

const readCmsPage = async (
  request: AuthenticatedMedusaRequest,
  query: PopulationSourceQuery
): Promise<PopulationSourceRead> => {
  if (query.offset % query.limit !== 0) {
    return { kind: "invalid", message: "CMS offset must align to limit" }
  }
  const locale = resolveCatalogMarketLocale(query.market)
  if (!locale) {
    return { kind: "invalid", message: "Market has no exact locale" }
  }
  const service = request.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  const result =
    query.sourceKind === "article"
      ? await service.listPublishedArticles({
          limit: query.limit,
          locale,
          page: query.offset / query.limit + 1,
        })
      : await service.listPublishedPages({
          limit: query.limit,
          locale,
          page: query.offset / query.limit + 1,
        })
  const items = result.docs.map(
    (document): CmsPopulationSourceItem => ({
      authorityKind: "payload-published-document",
      documentStatus: "published",
      legacySlug: document.slug,
      locale,
      sourceId: String(document.id),
      sourceVersion: sourceTimestamp(document.updatedAt),
      stableIdVerified: true,
    })
  )
  return createPopulationSourcePage(
    query,
    items,
    result.totalDocs,
    result.docs.length
  )
}

export const readPopulationSourcePage = async (
  request: AuthenticatedMedusaRequest,
  query: PopulationSourceQuery
): Promise<PopulationSourceRead> => {
  try {
    if (query.sourceKind === "product") {
      return await readProductPage(request, query)
    }
    if (query.sourceKind === "article" || query.sourceKind === "page") {
      return await readCmsPage(request, query)
    }
    return await readAssignedCatalogPage(request, query, query.sourceKind)
  } catch {
    return { kind: "unavailable" }
  }
}
