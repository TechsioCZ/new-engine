import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../../modules/url-registry-outbox/service"
import { deliverUrlRegistryOutboxEvent } from "./delivery-client"
import {
  dispatchUrlRegistryOutboxBatch,
  type UrlRegistryDispatchResult,
} from "./dispatcher"
import { parseUrlRegistryDispatcherConfig } from "./dispatcher-config"

type DispatchWorkflowInput = Readonly<{
  workerId: string
}>

type DispatchStepResult = UrlRegistryDispatchResult &
  Readonly<{ status: "completed" | "disabled" }>

const dispatchUrlRegistryOutboxStep = createStep<
  DispatchWorkflowInput,
  DispatchStepResult,
  DispatchStepResult
>(
  "dispatch-url-registry-outbox",
  async (input: DispatchWorkflowInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const config = parseUrlRegistryDispatcherConfig()
    if (!config.enabled) {
      logger.debug("URL registry dispatcher: disabled, skipping")
      return new StepResponse<DispatchStepResult>({
        acknowledged: 0,
        claimed: 0,
        failed: 0,
        retried: 0,
        status: "disabled",
        transitionErrors: 0,
      })
    }

    const service = container.resolve<UrlRegistryOutboxModuleService>(
      URL_REGISTRY_OUTBOX_MODULE
    )
    const result = await dispatchUrlRegistryOutboxBatch({
      deliver: (event) => deliverUrlRegistryOutboxEvent(event, config),
      logger,
      service,
      workerId: input.workerId,
    })
    return new StepResponse<DispatchStepResult>({
      ...result,
      status: "completed",
    })
  }
)

export const dispatchUrlRegistryOutboxWorkflow = createWorkflow(
  "dispatch-url-registry-outbox",
  (input: DispatchWorkflowInput) =>
    new WorkflowResponse(dispatchUrlRegistryOutboxStep(input))
)
