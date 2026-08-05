import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { generateGLSLabelPdfStep } from "./steps/generate-gls-label-pdf"
import type { GenerateGLSLabelPdfStepOutput } from "./steps/generate-gls-label-pdf"

export interface GenerateGLSLabelsWorkflowInput {
  order_ids: string[]
}

export type GenerateGLSLabelsWorkflowOutput = GenerateGLSLabelPdfStepOutput

export const generateGLSLabelsWorkflow = createWorkflow(
  "generate-gls-labels",
  (input: GenerateGLSLabelsWorkflowInput) =>
    new WorkflowResponse(generateGLSLabelPdfStep(input)),
)
