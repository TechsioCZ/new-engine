import { z } from "zod"

export const workflowInputModeSchema = z.enum([
  "preview-prepare",
  "preview-deploy",
  "main-deploy",
  "preview-verify",
  "main-verify",
  "preview-teardown",
])

export const checkWorkflowInputsCommandInputSchema = z.object({
  mode: workflowInputModeSchema,
})

export type WorkflowInputMode = z.infer<typeof workflowInputModeSchema>
export type CheckWorkflowInputsCommandInput = z.infer<
  typeof checkWorkflowInputsCommandInputSchema
>
