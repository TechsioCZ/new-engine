import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService } from "./helpers"

export const createBrandAttributeTypesStep = createStep(
  "create-brand-attribute-types",
  async (input: CreateBrandAttributeTypesWorkflowInput, { container }) => {
    const attributeTypes = await getBrandService(
      container
    ).createBrandAttributeTypes(input.attribute_types)

    return new StepResponse(
      attributeTypes,
      attributeTypes.map((attributeType) => attributeType.id)
    )
  },
  async (createdIds, { container }) => {
    if (createdIds?.length) {
      await getBrandService(container).deleteBrandAttributeTypes(
        createdIds
      )
    }
  }
)
