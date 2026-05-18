import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetProductProducersWorkflowInput } from "../types"
import {
  getActiveProducerIds,
  getCurrentProductProducerIds,
  getProductProducerIdsToReplace,
  producerProductLink,
  replaceProductProducerLinks,
} from "./helpers"

export const setProductProducersStep = createStep(
  "set-product-producers",
  async (input: SetProductProducersWorkflowInput, { container }) => {
    const currentIds = await getCurrentProductProducerIds(
      container,
      input.product_id
    )
    const activeProducerIds = await getActiveProducerIds(container, currentIds)
    const currentIdsToReplace = getProductProducerIdsToReplace(
      currentIds,
      activeProducerIds,
      input.producer_ids
    )
    const { add, remove } = await replaceProductProducerLinks(
      container,
      currentIdsToReplace,
      input.producer_ids,
      (producerId) => producerProductLink(input.product_id, producerId)
    )

    return new StepResponse(
      {
        added: add,
        removed: remove,
      },
      {
        product_id: input.product_id,
        producer_ids: currentIds,
      }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const currentIds = await getCurrentProductProducerIds(
      container,
      previous.product_id
    )

    await replaceProductProducerLinks(
      container,
      currentIds,
      previous.producer_ids,
      (producerId) => producerProductLink(previous.product_id, producerId)
    )
  }
)
