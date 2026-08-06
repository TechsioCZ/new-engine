import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { chunk } from "@techsio/std/array"

import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import {
  getCurrentBrandProductLinks,
  getCurrentProductBrandLinks,
} from "../../brand"

type BrandAttributeRecord = Awaited<
  ReturnType<BrandModuleService["listBrandAttributes"]>
>[number]
type BrandAttributeTypeRecord = Awaited<
  ReturnType<BrandModuleService["listBrandAttributeTypes"]>
>[number]

type DeletionTimestamp = Date | string | null | undefined

interface ScopedBrandAttribute {
  attributeType?: { id: string } | null
  brand_id: string
  deleted_at?: DeletionTimestamp
  id: string
}

export interface CleanupProductBrandAttributesStepInput {
  attributeNames?: string[]
  productIds: string[]
}

export interface CleanupProductBrandAttributesCompensation {
  attributeIds: string[]
  attributeTypeIds: string[]
}

const normalizeLegacyName = (value: string) => value.trim().toLowerCase()
const LEGACY_ATTRIBUTE_BATCH_SIZE = 100
const MAX_LEGACY_ATTRIBUTE_PAGES = 1000
const ATTRIBUTE_TYPE_DELETE_CONCURRENCY = 20

const listAllBrandAttributeTypes = async (service: BrandModuleService) => {
  const listPage = async (
    records: BrandAttributeTypeRecord[],
    pageNumber: number,
  ): Promise<BrandAttributeTypeRecord[]> => {
    if (pageNumber >= MAX_LEGACY_ATTRIBUTE_PAGES) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Legacy Brand attribute type pagination exceeded its safety limit",
      )
    }
    const [page, total] = await service.listAndCountBrandAttributeTypes(
      {},
      {
        order: { id: "ASC" },
        skip: records.length,
        take: LEGACY_ATTRIBUTE_BATCH_SIZE,
        withDeleted: true,
      },
    )
    const nextRecords = [...records, ...page]
    if (page.length === 0 || nextRecords.length >= total) {
      return nextRecords
    }
    return await listPage(nextRecords, pageNumber + 1)
  }

  return await listPage([], 0)
}

const listScopedBrandAttributes = async (
  service: BrandModuleService,
  brandIds: string[],
  attributeTypeIds: string[],
) => {
  const listPage = async (
    records: BrandAttributeRecord[],
    pageNumber: number,
  ): Promise<BrandAttributeRecord[]> => {
    if (pageNumber >= MAX_LEGACY_ATTRIBUTE_PAGES) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Scoped Brand attribute pagination exceeded its safety limit",
      )
    }
    const [page, total] = await service.listAndCountBrandAttributes(
      {
        attribute_type_id: { $in: attributeTypeIds },
        brand_id: { $in: brandIds },
      },
      {
        order: { id: "ASC" },
        relations: ["attributeType"],
        skip: records.length,
        take: LEGACY_ATTRIBUTE_BATCH_SIZE,
      },
    )
    const nextRecords = [...records, ...page]
    if (page.length === 0 || nextRecords.length >= total) {
      return nextRecords
    }
    return await listPage(nextRecords, pageNumber + 1)
  }

  return await listPage([], 0)
}

export const selectScopedLegacyBrandAttributeIds = ({
  attributes,
  attributeTypeIds,
  brandIds,
}: {
  attributes: ScopedBrandAttribute[]
  attributeTypeIds: Set<string>
  brandIds: Set<string>
}) =>
  attributes
    .filter(
      (attribute) =>
        (attribute.deleted_at === undefined || attribute.deleted_at === null) &&
        brandIds.has(attribute.brand_id) &&
        attributeTypeIds.has(attribute.attributeType?.id ?? ""),
    )
    .map(({ id }) => id)

export const selectExclusivelyScopedBrandIds = ({
  links,
  productIds,
}: {
  links: { brand_id: string; product_id: string }[]
  productIds: Set<string>
}) => {
  const productIdsByBrandId = new Map<string, Set<string>>()

  for (const link of links) {
    const linkedProductIds =
      productIdsByBrandId.get(link.brand_id) ?? new Set<string>()
    linkedProductIds.add(link.product_id)
    productIdsByBrandId.set(link.brand_id, linkedProductIds)
  }

  return new Set(
    [...productIdsByBrandId].flatMap(([brandId, linkedProductIds]) =>
      linkedProductIds.size > 0 &&
      [...linkedProductIds].every((productId) => productIds.has(productId))
        ? [brandId]
        : [],
    ),
  )
}

export const cleanupProductBrandAttributesStep = createStep(
  "cleanup-product-brand-attributes",
  async (input: CleanupProductBrandAttributesStepInput, { container }) => {
    const names = new Set(
      (input.attributeNames ?? []).map(normalizeLegacyName).filter(Boolean),
    )
    if (names.size === 0 || input.productIds.length === 0) {
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] },
      )
    }

    const service = container.resolve<BrandModuleService>(BRAND_MODULE)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const links = await getCurrentProductBrandLinks(container, input.productIds)
    const candidateBrandIds = new Set(links.map(({ brand_id }) => brand_id))
    if (candidateBrandIds.size === 0) {
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] },
      )
    }
    const linksByBrand = await getCurrentBrandProductLinks(container, [
      ...candidateBrandIds,
    ])
    const brandIds = selectExclusivelyScopedBrandIds({
      links: linksByBrand,
      productIds: new Set(input.productIds),
    })
    const sharedBrandCount = candidateBrandIds.size - brandIds.size
    if (brandIds.size === 0) {
      logger.info(
        `Skipped legacy Brand attribute cleanup for ${sharedBrandCount} Brand(s) shared with Products outside the Herbatica seed`,
      )
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] },
      )
    }

    const attributeTypes = await listAllBrandAttributeTypes(service)
    const matchingTypes = attributeTypes.filter(
      (attributeType) =>
        (attributeType.deleted_at === undefined ||
          attributeType.deleted_at === null) &&
        names.has(normalizeLegacyName(attributeType.name)),
    )
    const attributeTypeIds = new Set(matchingTypes.map(({ id }) => id))
    if (attributeTypeIds.size === 0) {
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] },
      )
    }

    const scopedAttributes = await listScopedBrandAttributes(
      service,
      [...brandIds],
      [...attributeTypeIds],
    )
    const attributeIds = selectScopedLegacyBrandAttributeIds({
      attributeTypeIds,
      attributes: scopedAttributes,
      brandIds,
    })

    let deletedTypeIds: string[] = []
    await service.runInTransaction(async (context) => {
      if (attributeIds.length > 0) {
        await service.softDeleteBrandAttributes(attributeIds, {}, context)
      }

      const attributeTypeBatches = chunk(
        matchingTypes,
        ATTRIBUTE_TYPE_DELETE_CONCURRENCY,
      )
      const deleteBatch = async (
        batchIndex: number,
        accumulated: string[],
      ): Promise<string[]> => {
        const attributeTypeBatch = attributeTypeBatches[batchIndex]
        if (attributeTypeBatch === undefined) {
          return accumulated
        }
        const deletedInBatch = await Promise.all(
          attributeTypeBatch.map(async (attributeType) => {
            const remaining = await service.listBrandAttributes(
              { attribute_type_id: attributeType.id },
              { select: ["id"], take: 1 },
              context,
            )
            if (remaining.length > 0) {
              return null
            }
            await service.softDeleteBrandAttributeTypes(
              [attributeType.id],
              {},
              context,
            )
            return attributeType.id
          }),
        )
        return await deleteBatch(batchIndex + 1, [
          ...accumulated,
          ...deletedInBatch.filter((id) => id !== null),
        ])
      }
      deletedTypeIds = await deleteBatch(0, [])
    })

    logger.info(
      `Removed ${attributeIds.length} legacy Brand attributes from ${brandIds.size} exclusively Herbatica Brands; skipped ${sharedBrandCount} shared Brands; removed ${deletedTypeIds.length} unused global types`,
    )
    return new StepResponse(
      {
        assignments: attributeIds.length,
        attributeTypes: deletedTypeIds.length,
      },
      { attributeIds, attributeTypeIds: deletedTypeIds },
    )
  },
  async (
    compensation: CleanupProductBrandAttributesCompensation | undefined,
    { container },
  ) => {
    if (compensation === undefined) {
      return
    }
    const service = container.resolve<BrandModuleService>(BRAND_MODULE)
    await service.runInTransaction(async (context) => {
      if (compensation.attributeTypeIds.length > 0) {
        await service.restoreBrandAttributeTypes(
          compensation.attributeTypeIds,
          {},
          context,
        )
      }
      if (compensation.attributeIds.length > 0) {
        await service.restoreBrandAttributes(
          compensation.attributeIds,
          {},
          context,
        )
      }
    })
  },
)
