import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { GLSLabelFormat } from "../../modules/gls-client/types"
import {
  type GenerateGLSLabelPdfStepOutput,
  generateGLSLabelPdfStep,
} from "./steps/generate-gls-label-pdf"

export type GenerateGLSLabelsWorkflowInput = {
  order_ids: string[]
  label_format?: GLSLabelFormat
  label_offset?: number
}

export type GenerateGLSLabelsWorkflowOutput = GenerateGLSLabelPdfStepOutput

export const generateGLSLabelsWorkflow = createWorkflow(
  "generate-gls-labels",
  (input: GenerateGLSLabelsWorkflowInput) =>
    new WorkflowResponse(generateGLSLabelPdfStep(input))
)
