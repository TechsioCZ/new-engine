import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { synchronizeSearchProfilesWorkflow } from "../../../../workflows/meilisearch/workflows/synchronize-search-profiles"
import type { AdminSearchProfileSyncSchemaType } from "../validators"

export async function POST(
  request: MedusaRequest<AdminSearchProfileSyncSchemaType>,
  response: MedusaResponse
) {
  const { result } = await synchronizeSearchProfilesWorkflow(request.scope).run(
    { input: { mode: request.validatedBody.mode } }
  )

  response.json({ result })
}
