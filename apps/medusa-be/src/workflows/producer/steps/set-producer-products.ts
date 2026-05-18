import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetProducerProductsWorkflowInput } from "../types"
import {
  getCurrentProducerProductIds,
  producerProductLink,
  replaceProductProducerLinks,
} from "./helpers"

export const setProducerProductsStep = createStep(
  "set-producer-products",
  async (input: SetProducerProductsWorkflowInput, { container }) => {
    const currentIds = await getCurrentProducerProductIds(
      container,
      input.producer_id
    )
    const { add, remove } = await replaceProductProducerLinks(
      container,
      currentIds,
      input.product_ids,
      (productId) => producerProductLink(productId, input.producer_id)
    )

    return new StepResponse(
      {
        added: add,
        removed: remove,
      },
      {
        producer_id: input.producer_id,
        product_ids: currentIds,
      }
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    const currentIds = await getCurrentProducerProductIds(
      container,
      previous.producer_id
    )

    await replaceProductProducerLinks(
      container,
      currentIds,
      previous.product_ids,
      (productId) => producerProductLink(productId, previous.producer_id)
    )
  }
)
