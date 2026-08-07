import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
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

export type CleanupProductBrandAttributesStepInput = {
  attributeNames?: string[]
  productIds: string[]
}

export type CleanupProductBrandAttributesCompensation = {
  attributeIds: string[]
  attributeTypeIds: string[]
}

const normalizeLegacyName = (value: string) => value.trim().toLowerCase()
const LEGACY_ATTRIBUTE_BATCH_SIZE = 100

const listAllBrandAttributeTypes = async (service: BrandModuleService) => {
  const records: BrandAttributeTypeRecord[] = []
  let count = Number.POSITIVE_INFINITY

  while (records.length < count) {
    const [page, total] = (await service.listAndCountBrandAttributeTypes(
      {},
      {
        order: { id: "ASC" },
        skip: records.length,
        take: LEGACY_ATTRIBUTE_BATCH_SIZE,
        withDeleted: true,
      }
    )) as [BrandAttributeTypeRecord[], number]
    records.push(...page)
    count = total

    if (page.length === 0) {
      break
    }
  }

  return records
}

const listScopedBrandAttributes = async (
  service: BrandModuleService,
  brandIds: string[],
  attributeTypeIds: string[]
) => {
  const records: BrandAttributeRecord[] = []
  let count = Number.POSITIVE_INFINITY

  while (records.length < count) {
    const [page, total] = (await service.listAndCountBrandAttributes(
      {
        attribute_type_id: { $in: attributeTypeIds },
        brand_id: { $in: brandIds },
      },
      {
        order: { id: "ASC" },
        relations: ["attributeType"],
        skip: records.length,
        take: LEGACY_ATTRIBUTE_BATCH_SIZE,
      }
    )) as [BrandAttributeRecord[], number]
    records.push(...page)
    count = total

    if (page.length === 0) {
      break
    }
  }

  return records
}

export function selectScopedLegacyBrandAttributeIds({
  attributes,
  attributeTypeIds,
  brandIds,
}: {
  attributes: BrandAttributeRecord[]
  attributeTypeIds: Set<string>
  brandIds: Set<string>
}) {
  return attributes
    .filter(
      (attribute) =>
        !attribute.deleted_at &&
        brandIds.has(attribute.brand_id) &&
        attributeTypeIds.has(attribute.attributeType?.id ?? "")
    )
    .map(({ id }) => id)
}

export function selectExclusivelyScopedBrandIds({
  links,
  productIds,
}: {
  links: Array<{ brand_id: string; product_id: string }>
  productIds: Set<string>
}) {
  const productIdsByBrandId = new Map<string, Set<string>>()

  for (const link of links) {
    const linkedProductIds =
      productIdsByBrandId.get(link.brand_id) ?? new Set<string>()
    linkedProductIds.add(link.product_id)
    productIdsByBrandId.set(link.brand_id, linkedProductIds)
  }

  return new Set(
    [...productIdsByBrandId].flatMap(([brandId, linkedProductIds]) =>
      linkedProductIds.size &&
      [...linkedProductIds].every((productId) => productIds.has(productId))
        ? [brandId]
        : []
    )
  )
}

export const cleanupProductBrandAttributesStep = createStep(
  "cleanup-product-brand-attributes",
  async (input: CleanupProductBrandAttributesStepInput, { container }) => {
    const names = new Set(
      (input.attributeNames ?? []).map(normalizeLegacyName).filter(Boolean)
    )
    if (!(names.size && input.productIds.length)) {
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] }
      )
    }

    const service = container.resolve<BrandModuleService>(BRAND_MODULE)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const links = await getCurrentProductBrandLinks(container, input.productIds)
    const candidateBrandIds = new Set(links.map(({ brand_id }) => brand_id))
    if (candidateBrandIds.size === 0) {
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] }
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
        `Skipped legacy Brand attribute cleanup for ${sharedBrandCount} Brand(s) shared with Products outside the Herbatica seed`
      )
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] }
      )
    }

    const attributeTypes = await listAllBrandAttributeTypes(service)
    const matchingTypes = attributeTypes.filter(
      (attributeType) =>
        !attributeType.deleted_at &&
        names.has(normalizeLegacyName(attributeType.name))
    )
    const attributeTypeIds = new Set(matchingTypes.map(({ id }) => id))
    if (attributeTypeIds.size === 0) {
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] }
      )
    }

    const scopedAttributes = await listScopedBrandAttributes(
      service,
      [...brandIds],
      [...attributeTypeIds]
    )
    const attributeIds = selectScopedLegacyBrandAttributeIds({
      attributes: scopedAttributes,
      attributeTypeIds,
      brandIds,
    })

    const deletedTypeIds: string[] = []
    await service.runInTransaction(async (context) => {
      if (attributeIds.length) {
        await service.softDeleteBrandAttributes(attributeIds, {}, context)
      }

      for (const attributeType of matchingTypes) {
        const remaining = await service.listBrandAttributes(
          { attribute_type_id: attributeType.id },
          { select: ["id"], take: 1 },
          context
        )
        if (remaining.length === 0) {
          await service.softDeleteBrandAttributeTypes(
            [attributeType.id],
            {},
            context
          )
          deletedTypeIds.push(attributeType.id)
        }
      }
    })

    logger.info(
      `Removed ${attributeIds.length} legacy Brand attributes from ${brandIds.size} exclusively Herbatica Brands; skipped ${sharedBrandCount} shared Brands; removed ${deletedTypeIds.length} unused global types`
    )
    return new StepResponse(
      {
        assignments: attributeIds.length,
        attributeTypes: deletedTypeIds.length,
      },
      { attributeIds, attributeTypeIds: deletedTypeIds }
    )
  },
  async (
    compensation: CleanupProductBrandAttributesCompensation | undefined,
    { container }
  ) => {
    if (!compensation) {
      return
    }
    const service = container.resolve<BrandModuleService>(BRAND_MODULE)
    await service.runInTransaction(async (context) => {
      if (compensation.attributeTypeIds.length) {
        await service.restoreBrandAttributeTypes(
          compensation.attributeTypeIds,
          {},
          context
        )
      }
      if (compensation.attributeIds.length) {
        await service.restoreBrandAttributes(
          compensation.attributeIds,
          {},
          context
        )
      }
    })
  }
)
