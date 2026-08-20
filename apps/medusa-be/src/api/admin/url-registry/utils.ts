import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type {
  IProductModuleService,
  ISalesChannelModuleService,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../modules/storefront-url-assignment"
import {
  type AdminUpsertCollectionUrlAssignment,
  AdminUpsertCollectionUrlAssignmentSchema,
  type CollectionUrlAssignmentResponse,
  type StorefrontUrlAssignmentEntityKind,
  serializeStorefrontUrlAssignment,
} from "../../../modules/storefront-url-assignment/contracts"
import type { StorefrontUrlAssignmentRecord } from "../../../modules/storefront-url-assignment/models/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../../../modules/storefront-url-assignment/service"
import {
  type CatalogTranslationEntityKind,
  type CatalogTranslationProof,
  type CatalogTranslationReadResult,
  readExactCatalogTranslation,
  resolveCatalogMarketLocale,
} from "../../../utils/catalog-translation"

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
}: Readonly<{
  assignmentService: StorefrontUrlAssignmentModuleService
  entityId: string
  entityKind: StorefrontUrlAssignmentEntityKind
  existing: StorefrontUrlAssignmentRecord | undefined
  input: AdminUpsertCollectionUrlAssignment
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
    ? assignmentService.updateStorefrontUrlAssignments({
        id: existing.id,
        sales_channel_id: input.salesChannelId,
        public_slug: input.publicSlug,
        publication_status: input.publicationStatus,
        source_version: nextSourceVersion,
      })
    : assignmentService.createStorefrontUrlAssignments({
        schema_version: 1,
        entity_kind: entityKind,
        entity_id: entityId,
        market_code: input.marketCode,
        sales_channel_id: input.salesChannelId,
        public_slug: input.publicSlug,
        publication_status: input.publicationStatus,
        source_version: nextSourceVersion,
      })
}

class MissingCatalogTranslationError extends Error {
  readonly localeCode: string

  constructor(localeCode: string) {
    super(`Exact ${localeCode} Translation record is required`)
    this.localeCode = localeCode
  }
}

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
    const { assignmentService, productService, salesChannelService } =
      resolveDependencies(request)
    const [entityExists, salesChannels] = await Promise.all([
      sourceEntityExists(request, productService, entityKind, entityId),
      salesChannelService.listSalesChannels(
        { id: input.data.salesChannelId },
        { select: ["id"], take: 1 }
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
        { take: 2 }
      ),
      assignmentService.listStorefrontUrlAssignments(
        {
          entity_kind: entityKind,
          market_code: input.data.marketCode,
          public_slug: input.data.publicSlug,
        },
        { take: 2 }
      ),
    ])
    if (existingRecords.length > 1 || conflictingSlugRecords.length > 1) {
      return response
        .status(503)
        .json({ message: "Storefront assignment state is invalid" })
    }
    const existing = existingRecords[0]
    const conflict = conflictingSlugRecords.find(
      (candidate) => candidate.id !== existing?.id
    )
    if (conflict) {
      return response.status(409).json({
        message:
          "Public slug is already assigned for this entity kind and market",
      })
    }

    const assignment = await persistAdminAssignment({
      assignmentService,
      entityId,
      entityKind,
      existing,
      input: input.data,
    })

    return response.json({
      assignment: serializeStorefrontUrlAssignment(assignment, entityKind),
      translation,
    })
  } catch (error) {
    if (error instanceof MissingCatalogTranslationError) {
      return response.status(409).json({
        message: `${error.message} before publication`,
      })
    }
    return response
      .status(503)
      .json({ message: "Storefront assignments are temporarily unavailable" })
  }
}
