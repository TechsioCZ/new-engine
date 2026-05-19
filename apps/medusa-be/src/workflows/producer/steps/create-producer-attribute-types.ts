import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateProducerAttributeTypesWorkflowInput } from "../types"
import { getProducerService } from "./helpers"

export const createProducerAttributeTypesStep = createStep(
  "create-producer-attribute-types",
  async (input: CreateProducerAttributeTypesWorkflowInput, { container }) => {
    const attributeTypes = await getProducerService(
      container
    ).createProducerAttributeTypes(input.attribute_types)

    return new StepResponse(
      attributeTypes,
      attributeTypes.map((attributeType) => attributeType.id)
    )
  },
  async (createdIds, { container }) => {
    if (createdIds?.length) {
      await getProducerService(container).deleteProducerAttributeTypes(
        createdIds
      )
    }
  }
)
