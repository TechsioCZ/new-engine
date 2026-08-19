import { WorkflowManager } from "@medusajs/framework/orchestration"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  linkProductsToSalesChannelWorkflow,
  linkProductsToSalesChannelWorkflowId,
} from "@medusajs/medusa/core-flows"
import { describe, expect, it, vi } from "vitest"
import {
  emitProductChannelLinkedLifecycle,
  emitProductChannelUnlinkedLifecycle,
  linkProductsToSalesChannelWithUrlRegistryWorkflow,
} from "../../../src/workflows/hooks/product-sales-channel-lifecycle-url-registry"

type WorkflowStep = Readonly<{
  action?: string
  next?: WorkflowStep
}>

const workflowActions = (step: WorkflowStep | undefined) => {
  const actions: string[] = []
  let current = step
  while (current) {
    if (current.action) {
      actions.push(current.action)
    }
    current = current.next
  }
  return actions
}

const lifecycleContext = (salesChannels: readonly { id: string }[]) => {
  const emit = vi.fn().mockResolvedValue(undefined)
  const listTranslations = vi
    .fn()
    .mockImplementation(
      async ({ locale_code: localeCode, reference_id: referenceIds }) =>
        (referenceIds as string[]).map((referenceId) => ({
          deleted_at: null,
          id: `translation_${referenceId}_${localeCode}`,
          locale_code: localeCode,
          reference: "product",
          reference_id: referenceId,
          translations: { title: "Produkt" },
        }))
    )
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        id: "prod_01PRODUCT",
        metadata: {
          url_registry_publication: {
            markets: {
              sk: {
                publicationStatus: "published",
                publicSlug: "produkt",
                salesChannelId: "sc_sk",
              },
            },
            schemaVersion: 1,
          },
        },
        sales_channels: salesChannels,
        updated_at: "2026-08-19T10:00:00.000Z",
      },
    ],
  })
  return {
    emit,
    graph,
    context: {
      container: {
        resolve: (key: string) => {
          if (key === ContainerRegistrationKeys.QUERY) {
            return { graph }
          }
          if (key === Modules.EVENT_BUS) {
            return { emit }
          }
          if (key === Modules.TRANSLATION) {
            return { listTranslations }
          }
          throw new Error(`Unexpected container resolution: ${key}`)
        },
      },
      eventGroupId: "01ARYZ6S41TSV4RRFFQ69G5FAV",
    },
  }
}

describe("product sales-channel URL registry lifecycle workflow", () => {
  it("replaces the exact core workflow used by the Admin API", () => {
    expect(linkProductsToSalesChannelWithUrlRegistryWorkflow.getName()).toBe(
      linkProductsToSalesChannelWorkflowId
    )
    expect(linkProductsToSalesChannelWorkflow.getName()).toBe(
      linkProductsToSalesChannelWorkflowId
    )
    expect(
      workflowActions(
        WorkflowManager.getWorkflow(linkProductsToSalesChannelWorkflowId)?.flow_
      )
    ).toEqual([
      "associate-products-with-channels",
      "detach-products-from-sales-channels-step",
      "emit-product-channel-linked-lifecycle",
      "emit-product-channel-unlinked-lifecycle",
    ])
  })

  it("registers invocation and compensation handlers for both URLR steps", () => {
    const handlers = WorkflowManager.getWorkflow(
      linkProductsToSalesChannelWorkflowId
    )?.handlers_

    expect(handlers?.get("emit-product-channel-linked-lifecycle")).toEqual(
      expect.objectContaining({
        compensate: expect.any(Function),
        invoke: expect.any(Function),
      })
    )
    expect(handlers?.get("emit-product-channel-unlinked-lifecycle")).toEqual(
      expect.objectContaining({
        compensate: expect.any(Function),
        invoke: expect.any(Function),
      })
    )
  })

  it("emits linked and unlinked reasons from the workflow-bound handlers", async () => {
    const linked = lifecycleContext([{ id: "sc_sk" }])
    await emitProductChannelLinkedLifecycle(
      { productIds: ["prod_01PRODUCT"] },
      linked.context as never
    )
    expect(linked.emit).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ reason: "channel-linked" }),
        }),
      ])
    )

    const unlinked = lifecycleContext([])
    await emitProductChannelUnlinkedLifecycle(
      { productIds: ["prod_01PRODUCT"] },
      unlinked.context as never
    )
    expect(unlinked.emit).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            marketAssignments: expect.arrayContaining([
              expect.objectContaining({ assignment: null, marketCode: "sk" }),
            ]),
            reason: "channel-unlinked",
          }),
        }),
      ])
    )
  })

  it("does not query or emit for the empty side of a link mutation", async () => {
    const empty = lifecycleContext([])

    await emitProductChannelUnlinkedLifecycle(
      { productIds: [] },
      empty.context as never
    )

    expect(empty.graph).not.toHaveBeenCalled()
    expect(empty.emit).not.toHaveBeenCalled()
  })
})
