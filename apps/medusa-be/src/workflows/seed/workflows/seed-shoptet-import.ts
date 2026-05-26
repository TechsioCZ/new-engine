import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import seedDatabaseWorkflow, {
  type SeedDatabaseWorkflowInput,
} from "./seed-database"

const SeedShoptetImportWorkflowId = "seed-shoptet-import-workflow"

export type SeedShoptetImportWorkflowInput = SeedDatabaseWorkflowInput

function seedShoptetImportWorkflowComposer(
  input: SeedShoptetImportWorkflowInput
) {
  const seedResult = seedDatabaseWorkflow.runAsStep({ input })

  return new WorkflowResponse(seedResult)
}

export const seedShoptetImportWorkflow = createWorkflow(
  SeedShoptetImportWorkflowId,
  seedShoptetImportWorkflowComposer
)

export default seedShoptetImportWorkflow
