import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { processInvoicesBatchStep } from "./steps/process-batch"
import type {
  AttachInvoicesBatchInput,
  AttachInvoicesBatchOutput,
} from "./types"

export const attachInvoicesBatchWorkflow = createWorkflow(
  "symmy-attach-invoices-batch",
  (input: AttachInvoicesBatchInput) => {
    const result = processInvoicesBatchStep(input)
    return new WorkflowResponse<AttachInvoicesBatchOutput>(result)
  }
)
