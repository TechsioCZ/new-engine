import { WorkflowManager } from "@medusajs/framework/orchestration"
import type { LinkWorkflowInput } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  type StepExecutionContext,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  associateProductsWithSalesChannelsStep,
  detachProductsFromSalesChannelsStep,
  linkProductsToSalesChannelWorkflowId,
} from "@medusajs/medusa/core-flows"
import {
  clearProductLifecycleEvents,
  emitProductLifecycleEvents,
} from "../url-registry-outbox/product-lifecycle-event"

type ProductSalesChannelLifecycleStepInput = Readonly<{
  productIds: readonly string[]
}>

type ProductSalesChannelLifecycleContext = Pick<
  StepExecutionContext,
  "container" | "eventGroupId"
>

export const emitProductChannelLinkedLifecycle = async (
  input: ProductSalesChannelLifecycleStepInput,
  context: ProductSalesChannelLifecycleContext
) =>
  await emitProductLifecycleEvents(
    { productIds: input.productIds, reason: "channel-linked" },
    context
  )

export const emitProductChannelUnlinkedLifecycle = async (
  input: ProductSalesChannelLifecycleStepInput,
  context: ProductSalesChannelLifecycleContext
) =>
  await emitProductLifecycleEvents(
    { productIds: input.productIds, reason: "channel-unlinked" },
    context
  )

export const emitProductChannelLinkedLifecycleStep = createStep(
  "emit-product-channel-linked-lifecycle",
  emitProductChannelLinkedLifecycle,
  clearProductLifecycleEvents
)

export const emitProductChannelUnlinkedLifecycleStep = createStep(
  "emit-product-channel-unlinked-lifecycle",
  emitProductChannelUnlinkedLifecycle,
  clearProductLifecycleEvents
)

WorkflowManager.unregister(linkProductsToSalesChannelWorkflowId)

export const linkProductsToSalesChannelWithUrlRegistryWorkflow = createWorkflow(
  linkProductsToSalesChannelWorkflowId,
  (input: LinkWorkflowInput) => {
    const linksToCreate = transform({ input }, ({ input: current }) =>
      current.add?.map((productId) => ({
        product_id: productId,
        sales_channel_id: current.id,
      }))
    )
    const linksToDismiss = transform({ input }, ({ input: current }) =>
      current.remove?.map((productId) => ({
        product_id: productId,
        sales_channel_id: current.id,
      }))
    )
    const attached = associateProductsWithSalesChannelsStep({
      links: linksToCreate,
    })
    const detached = detachProductsFromSalesChannelsStep({
      links: linksToDismiss,
    })
    const lifecycle = transform(
      { attached, detached, input },
      ({ input: current }) => ({
        linkedProductIds: current.add ?? [],
        unlinkedProductIds: current.remove ?? [],
      })
    )

    emitProductChannelLinkedLifecycleStep({
      productIds: lifecycle.linkedProductIds,
    })
    emitProductChannelUnlinkedLifecycleStep({
      productIds: lifecycle.unlinkedProductIds,
    })
  }
)
