import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import { getCurrentProductBrandLinks } from "../../brand"

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
    const brandIds = new Set(links.map(({ brand_id }) => brand_id))
    if (brandIds.size === 0) {
      return new StepResponse(
        { assignments: 0, attributeTypes: 0 },
        { attributeIds: [], attributeTypeIds: [] }
      )
    }

    const attributeTypes = (await service.listBrandAttributeTypes(
      {},
      { take: 10_000, withDeleted: true }
    )) as BrandAttributeTypeRecord[]
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

    const scopedAttributes = (await service.listBrandAttributes(
      {
        attribute_type_id: { $in: [...attributeTypeIds] },
        brand_id: { $in: [...brandIds] },
      },
      {
        relations: ["attributeType"],
        take: Math.max(attributeTypeIds.size * brandIds.size, 1),
      }
    )) as BrandAttributeRecord[]
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
      `Removed ${attributeIds.length} legacy Brand attributes from ${brandIds.size} Herbatica Brands; removed ${deletedTypeIds.length} unused global types`
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
