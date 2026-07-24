import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const restoreBrandAttributeTypesStep = createStep(
  "restore-brand-attribute-types",
  async (input: RestoreBrandAttributeTypesWorkflowInput, { container }) => {
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

    const deletedIds = attributeTypes
      .filter((attributeType) => !!attributeType.deleted_at)
      .map((attributeType) => attributeType.id)
    const deletedAttributeTypes = attributeTypes.filter(
      (attributeType) => !!attributeType.deleted_at
    )

    if (deletedIds.length) {
      const restoringNames = deletedAttributeTypes.map(
        (attributeType) => attributeType.name
      )

      if (new Set(restoringNames).size !== restoringNames.length) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          "Cannot restore multiple brand attribute types with the same name"
        )
      }

      const activeCollisions = await service.listBrandAttributeTypes(
        {
          name: { $in: restoringNames },
        },
        {
          take: Math.max(restoringNames.length, 1),
          withDeleted: false,
        }
      )

      if (activeCollisions.length) {
        const [activeCollision] = activeCollisions
        if (!activeCollision) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Brand attribute type collision lookup returned an empty record"
          )
        }
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `Cannot restore brand attribute type "${activeCollision.name}" because an active type already uses that name`
        )
      }

      await service.restoreBrandAttributeTypes(deletedIds)
    }

    return new StepResponse(
      attributeTypes.map((attributeType) => ({
        ...attributeType,
        deleted_at: null,
      })),
      deletedIds
    )
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getBrandService(container).softDeleteBrandAttributeTypes(
        restoredIds
      )
    }
  }
)
