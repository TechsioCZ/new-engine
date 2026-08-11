import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  GLS_CLIENT_MODULE,
  type GLSClientModuleService,
} from "../../modules/gls-client"
import { toGLSConfigResponse } from "../../modules/gls-client/config-response"
import type {
  GLSEnvironment,
  UpdateGLSConfigInput,
} from "../../modules/gls-client/types"

export type UpdateGLSProfileInput = UpdateGLSConfigInput & {
  environment: GLSEnvironment
}

const updateGLSConfigStep = createStep(
  "update-gls-config",
  async (input: UpdateGLSProfileInput, { container }) => {
    const service = container.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)
    const { environment, ...config } = input
    const updated = await service.updateConfig(environment, config)

    return new StepResponse(toGLSConfigResponse(updated))
  }
)

export const updateGLSConfigWorkflow = createWorkflow(
  "update-gls-config",
  (input: UpdateGLSProfileInput) =>
    new WorkflowResponse(updateGLSConfigStep(input))
)
