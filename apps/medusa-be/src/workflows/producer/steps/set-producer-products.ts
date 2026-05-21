import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { SetProducerProductsWorkflowInput } from "../types"
import {
  diffIds,
  dismissProductProducerLinks,
  getActiveProducerIds,
  getCurrentProducerProductIds,
  getCurrentProductProducerLinks,
  producerProductLink,
  replaceProductProducerLinks,
} from "./helpers"

export const setProducerProductsStep = createStep(
  "set-producer-products",
  async (input: SetProducerProductsWorkflowInput, { container }) => {
    const conflictingLinks = (
      await getCurrentProductProducerLinks(container, input.product_ids)
    ).filter((link) => link.producer_id !== input.producer_id)
    const activeProducerIds = await getActiveProducerIds(
      container,
      conflictingLinks.map((link) => link.producer_id)
    )
    const activeConflictingLinks = conflictingLinks.filter((link) =>
      activeProducerIds.has(link.producer_id)
    )
    const inactiveConflictingLinks = conflictingLinks.filter(
      (link) => !activeProducerIds.has(link.producer_id)
    )

    if (activeConflictingLinks.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Products are already linked to another producer: ${activeConflictingLinks
          .map((link) => link.product_id)
          .join(", ")}`
      )
    }

    const currentIds = await getCurrentProducerProductIds(
      container,
      input.producer_id
    )
    const { add: productIdsToAdd } = diffIds(currentIds, input.product_ids)
    const productIdsToAddSet = new Set(productIdsToAdd)
    const inactiveLinksToDismiss = inactiveConflictingLinks.filter((link) =>
      productIdsToAddSet.has(link.product_id)
    )

    await dismissProductProducerLinks(container, inactiveLinksToDismiss)

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
