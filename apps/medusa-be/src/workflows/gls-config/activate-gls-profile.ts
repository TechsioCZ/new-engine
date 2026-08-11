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
import type { GLSEnvironment } from "../../modules/gls-client/types"

export type ActivateGLSProfileInput = {
  environment: GLSEnvironment
  confirmed: boolean
}

const activateGLSProfileStep = createStep(
  "activate-gls-profile",
  async (input: ActivateGLSProfileInput, { container }) => {
    const service = container.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)
    const config = await service.activateConfig(
      input.environment,
      input.confirmed
    )

    return new StepResponse({ environment: config.environment })
  }
)

export const activateGLSProfileWorkflow = createWorkflow(
  "activate-gls-profile",
  (input: ActivateGLSProfileInput) =>
    new WorkflowResponse(activateGLSProfileStep(input))
)
