import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { symmyProcessInvoicesBatchStep } from "./steps/process-batch"
import type {
  AttachInvoicesBatchInput,
  AttachInvoicesBatchOutput,
} from "./types"

const symmyAttachInvoicesBatchWorkflow = createWorkflow(
  "symmy-attach-invoices-batch",
  (input: AttachInvoicesBatchInput) => {
    const result = symmyProcessInvoicesBatchStep(input)
    return new WorkflowResponse<AttachInvoicesBatchOutput>(result)
  }
)

export { symmyAttachInvoicesBatchWorkflow as attachInvoicesBatchWorkflow }
