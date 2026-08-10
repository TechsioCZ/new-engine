import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { GLS_CLIENT_MODULE } from "../../modules/gls-client"
import type { GLSClientModuleService } from "../../modules/gls-client"
import type { UpdateGLSConfigInput } from "../../modules/gls-client/types"

const updateGLSConfigStep = createStep(
  "update-gls-config",
  async (input: UpdateGLSConfigInput, { container }) => {
    const service = container.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)

    return new StepResponse(await service.updateConfig(input))
  },
)

export const updateGLSConfigWorkflow = createWorkflow(
  "update-gls-config",
  (input: UpdateGLSConfigInput) =>
    new WorkflowResponse(updateGLSConfigStep(input)),
)
