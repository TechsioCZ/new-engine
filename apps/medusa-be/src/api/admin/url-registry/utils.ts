import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  IProductModuleService,
  ISalesChannelModuleService,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../../../modules/storefront-url-assignment/catalog-lifecycle"
import {
  type AdminUpsertCollectionUrlAssignment,
  AdminUpsertCollectionUrlAssignmentSchema,
  type CollectionUrlAssignmentResponse,
  type StorefrontUrlAssignmentEntityKind,
  serializeStorefrontUrlAssignment,
} from "../../../modules/storefront-url-assignment/contracts"
import type { StorefrontUrlAssignmentRecord } from "../../../modules/storefront-url-assignment/models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../../../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../../../modules/url-registry-outbox/service"
import {
  type CatalogTranslationEntityKind,
  type CatalogTranslationProof,
  type CatalogTranslationReadResult,
  readExactCatalogTranslation,
  resolveCatalogMarketLocale,
} from "../../../utils/catalog-translation"
import { salesChannelSupportsMarket } from "../../../utils/notification-market-context"

export type AdminCatalogTranslationStatus =
  | Readonly<{ kind: "found"; proof: CatalogTranslationProof }>
  | Readonly<{ kind: "missing"; localeCode: string }>
  | Readonly<{ kind: "unchecked" }>

export type AdminAssignmentListResponse = {
  items: Array<
    CollectionUrlAssignmentResponse & {
      translation: Exclude<AdminCatalogTranslationStatus, { kind: "unchecked" }>
    }
  >
}

export type AdminAssignmentMutationResponse = {
  assignment: CollectionUrlAssignmentResponse
  translation: AdminCatalogTranslationStatus
}

type AssignmentMatchCandidate = {
  publication_status: string
  public_slug: string
  sales_channel_id: string
}

const assignmentMatchesInput = (
  existing: AssignmentMatchCandidate,
  input: AdminUpsertCollectionUrlAssignment
): boolean =>
  existing.sales_channel_id === input.salesChannelId &&
  existing.public_slug === input.publicSlug &&
  existing.publication_status === input.publicationStatus

const persistAdminAssignment = async ({
  assignmentService,
  entityId,
  entityKind,
  existing,
  input,
  sharedContext,
}: Readonly<{
  assignmentService: StorefrontUrlAssignmentModuleService
  entityId: string
  entityKind: StorefrontUrlAssignmentEntityKind
  existing: StorefrontUrlAssignmentRecord | undefined
  input: AdminUpsertCollectionUrlAssignment
  sharedContext: Context<SqlEntityManager>
}>): Promise<StorefrontUrlAssignmentRecord> => {
  if (existing && assignmentMatchesInput(existing, input)) {
    return existing
  }
  const nextSourceVersion = existing ? existing.source_version + 1 : 1
  if (!Number.isSafeInteger(nextSourceVersion)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Storefront assignment source version is invalid"
    )
  }
  return existing
    ? assignmentService.updateStorefrontUrlAssignments(
        {
          id: existing.id,
          sales_channel_id: input.salesChannelId,
          public_slug: input.publicSlug,
          publication_status: input.publicationStatus,
          source_version: nextSourceVersion,
        },
        sharedContext
      )
    : assignmentService.createStorefrontUrlAssignments(
        {
          schema_version: 1,
          entity_kind: entityKind,
          entity_id: entityId,
          market_code: input.marketCode,
          sales_channel_id: input.salesChannelId,
          public_slug: input.publicSlug,
          publication_status: input.publicationStatus,
          source_version: nextSourceVersion,
        },
        sharedContext
      )
}

class MissingCatalogTranslationError extends Error {
  readonly localeCode: string

  constructor(localeCode: string) {
    super(`Exact ${localeCode} Translation record is required`)
    this.localeCode = localeCode
  }
}

class MissingCatalogEntityError extends Error {}

const readPublicationTranslation = async (
  request: AuthenticatedMedusaRequest,
  entityKind: StorefrontUrlAssignmentEntityKind,
  entityId: string,
  input: AdminUpsertCollectionUrlAssignment
): Promise<AdminCatalogTranslationStatus> => {
  if (input.publicationStatus !== "published") {
    return { kind: "unchecked" }
  }
  const translation = await readExactCatalogTranslation({
    container: request.scope,
    entityId,
    entityKind,
    market: input.marketCode,
  })
  if (translation.kind === "missing") {
    throw new MissingCatalogTranslationError(translation.localeCode)
  }
  if (translation.kind !== "found") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Catalog translation state is unavailable or invalid"
    )
  }
  return translation
}

const resolveDependencies = (request: AuthenticatedMedusaRequest) => ({
  assignmentService:
    request.scope.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    ),
  outboxService: request.scope.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  ),
  productService: request.scope.resolve<IProductModuleService>(Modules.PRODUCT),
  salesChannelService: request.scope.resolve<ISalesChannelModuleService>(
    Modules.SALES_CHANNEL
  ),
})

export const sourceEntityExists = async (
  request: AuthenticatedMedusaRequest,
  productService: IProductModuleService,
  entityKind: CatalogTranslationEntityKind,
  entityId: string
): Promise<boolean> => {
  if (entityKind === "brand") {
    const records = await request.scope
      .resolve<BrandModuleService>(BRAND_MODULE)
      .listBrands({ id: entityId }, { select: ["id"], take: 1 })
    return records.length === 1
  }
  if (entityKind === "product") {
    const records = await productService.listProducts(
      { id: entityId },
      { select: ["id"], take: 1 }
    )
    return records.length === 1
  }
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

export const readAdminCatalogTranslation = async (
  request: AuthenticatedMedusaRequest,
  entityKind: CatalogTranslationEntityKind,
  entityId: string,
  market: Parameters<typeof readExactCatalogTranslation>[0]["market"]
): Promise<CatalogTranslationReadResult> => {
  try {
    const productService = request.scope.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    if (
      !(await sourceEntityExists(request, productService, entityKind, entityId))
    ) {
      return {
        kind: "missing",
        localeCode: resolveCatalogMarketLocale(market) ?? "",
      }
    }
    return await readExactCatalogTranslation({
      container: request.scope,
      entityId,
      entityKind,
      market,
    })
  } catch {
    return { kind: "unavailable" }
  }
}

export const handleAdminAssignmentGET = async (
  request: AuthenticatedMedusaRequest,
  response: MedusaResponse<AdminAssignmentListResponse | { message: string }>,
  entityKind: StorefrontUrlAssignmentEntityKind
) => {
  try {
    const entityId = request.params.id ?? ""
    const { assignmentService, productService } = resolveDependencies(request)
    if (
      !(await sourceEntityExists(request, productService, entityKind, entityId))
    ) {
      return response.status(404).json({ message: "Entity was not found" })
    }

    const records = await assignmentService.listStorefrontUrlAssignments(
      { entity_kind: entityKind, entity_id: entityId },
      { order: { market_code: "ASC" }, take: 10 }
    )
    const assignments = records.map((record) =>
      serializeStorefrontUrlAssignment(record, entityKind)
    )
    const translations = await Promise.all(
      assignments.map((assignment) =>
        readExactCatalogTranslation({
          container: request.scope,
          entityId,
          entityKind,
          market: assignment.marketCode,
        })
      )
    )
    if (
      translations.some(
        (translation) =>
          translation.kind === "unavailable" ||
          translation.kind === "invalid-response"
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Catalog translation state is unavailable or invalid"
      )
    }
    return response.json({
      items: assignments.map((assignment, index) => ({
        ...assignment,
        translation: translations[index] as Exclude<
          AdminCatalogTranslationStatus,
          { kind: "unchecked" }
        >,
      })),
    })
  } catch {
    return response
      .status(503)
      .json({ message: "Storefront assignments are temporarily unavailable" })
  }
}

export const handleAdminAssignmentPOST = async (
  request: AuthenticatedMedusaRequest<AdminUpsertCollectionUrlAssignment>,
  response: MedusaResponse<
    AdminAssignmentMutationResponse | { message: string }
  >,
  entityKind: StorefrontUrlAssignmentEntityKind
) => {
  const input = AdminUpsertCollectionUrlAssignmentSchema.safeParse(request.body)
  if (!input.success) {
    return response
      .status(400)
      .json({ message: "Invalid storefront assignment" })
  }

  try {
    const entityId = request.params.id ?? ""
    const {
      assignmentService,
      outboxService,
      productService,
      salesChannelService,
    } = resolveDependencies(request)
    const [entityExists, salesChannels] = await Promise.all([
      sourceEntityExists(request, productService, entityKind, entityId),
      salesChannelService.listSalesChannels(
        { id: input.data.salesChannelId },
        { select: ["id", "metadata"], take: 1 }
      ),
    ])
    if (!entityExists) {
      return response.status(404).json({ message: "Entity was not found" })
    }
    if (salesChannels.length === 0) {
      return response
        .status(404)
        .json({ message: "Sales Channel was not found" })
    }
    if (!salesChannelSupportsMarket(salesChannels[0], input.data.marketCode)) {
      return response.status(400).json({
        message: "Sales Channel is not configured for the requested market",
      })
    }

    const mutation = await assignmentService.runInTransaction(
      async (sharedContext) => {
        await assignmentService.lockCatalogEntityAssignments(
          entityKind,
          entityId,
          sharedContext
        )
        if (
          !(await sourceEntityExists(
            request,
            productService,
            entityKind,
            entityId
          ))
        ) {
          throw new MissingCatalogEntityError()
        }
        const translation = await readPublicationTranslation(
          request,
          entityKind,
          entityId,
          input.data
        )
        const [existingRecords, conflictingSlugRecords] = await Promise.all([
          assignmentService.listStorefrontUrlAssignments(
            {
              entity_kind: entityKind,
              entity_id: entityId,
              market_code: input.data.marketCode,
            },
            { take: 2 },
            sharedContext
          ),
          assignmentService.listStorefrontUrlAssignments(
            {
              entity_kind: entityKind,
              market_code: input.data.marketCode,
              public_slug: input.data.publicSlug,
            },
            { take: 2 },
            sharedContext
          ),
        ])
        if (existingRecords.length > 1 || conflictingSlugRecords.length > 1) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Storefront assignment state is invalid"
          )
        }
        const existing = existingRecords[0]
        const conflict = conflictingSlugRecords.find(
          (candidate) => candidate.id !== existing?.id
        )
        if (conflict) {
          throw new MedusaError(
            MedusaError.Types.DUPLICATE_ERROR,
            "Public slug is already assigned for this entity kind and market"
          )
        }
        const persisted = await persistAdminAssignment({
          assignmentService,
          entityId,
          entityKind,
          existing,
          input: input.data,
          sharedContext,
        })
        await enqueueCatalogAssignmentLifecycle(
          outboxService,
          persisted,
          sharedContext
        )
        return { assignment: persisted, translation }
      }
    )

    return response.json({
      assignment: serializeStorefrontUrlAssignment(
        mutation.assignment,
        entityKind
      ),
      translation: mutation.translation,
    })
  } catch (error) {
    if (error instanceof MissingCatalogEntityError) {
      return response.status(404).json({ message: "Entity was not found" })
    }
    if (error instanceof MissingCatalogTranslationError) {
      return response.status(409).json({
        message: `${error.message} before publication`,
      })
    }
    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.DUPLICATE_ERROR
    ) {
      return response.status(409).json({ message: error.message })
    }
    return response
      .status(503)
      .json({ message: "Storefront assignments are temporarily unavailable" })
  }
}
