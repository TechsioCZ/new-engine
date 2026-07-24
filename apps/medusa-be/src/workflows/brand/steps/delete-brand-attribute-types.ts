import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { DeleteBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const deleteBrandAttributeTypesStep = createStep(
  "delete-brand-attribute-types",
  async (input: DeleteBrandAttributeTypesWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const attributeTypes = await service.listBrandAttributeTypes(
      { id: { $in: input.ids } },
      {
        take: Math.max(input.ids.length, 1),
        withDeleted: true,
      }
    )
    const foundIds = new Set(
      attributeTypes.map((attributeType) => attributeType.id)
    )
    const missingIds = input.ids.filter((id) => !foundIds.has(id))

    if (missingIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Brand attribute type ids were not found: ${missingIds.join(", ")}`
      )
    }

    const active = attributeTypes.filter(
      (attributeType) => !attributeType.deleted_at
    )
    const activeIds = active.map((attributeType) => attributeType.id)

    if (activeIds.length) {
      await service.softDeleteBrandAttributeTypes(activeIds)
    }

    return new StepResponse(
      attributeTypes.map((attributeType) => ({
        ...attributeType,
        deleted_at: attributeType.deleted_at ?? new Date(),
      })),
      activeIds
    )
  },
  async (deletedIds, { container }) => {
    if (deletedIds?.length) {
      await getBrandService(container).restoreBrandAttributeTypes(deletedIds)
    }
  }
)
