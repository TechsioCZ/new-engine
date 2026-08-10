import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { synchronizeSearchProfiles } from "../../../../modules/meilisearch/synchronize"
import type { AdminSearchProfileSyncSchemaType } from "../validators"

export async function POST(
  request: MedusaRequest<AdminSearchProfileSyncSchemaType>,
  response: MedusaResponse
) {
  const result = await synchronizeSearchProfiles(
    request.scope,
    request.validatedBody.mode
  )

  response.json({ result })
}
