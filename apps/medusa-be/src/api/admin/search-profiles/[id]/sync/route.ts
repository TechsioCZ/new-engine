import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { synchronizeSearchProfilesWorkflow } from "../../../../../workflows/meilisearch/workflows/synchronize-search-profiles"
import {
  getSearchProfileService,
  retrieveSearchProfileOrThrow,
} from "../../utils"
import type { AdminSearchProfileSyncSchemaType } from "../../validators"

export async function POST(
  request: MedusaRequest<AdminSearchProfileSyncSchemaType>,
  response: MedusaResponse
) {
  const service = getSearchProfileService(request.scope)
  const profile = await retrieveSearchProfileOrThrow(
    service,
    request.params.id ?? ""
  )

  if (
    !Array.isArray(profile.sales_channel_ids) ||
    profile.sales_channel_ids.length === 0
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Assign at least one Sales Channel before synchronizing this profile."
    )
  }

  const { result } = await synchronizeSearchProfilesWorkflow(request.scope).run(
    {
      input: {
        mode: request.validatedBody.mode,
        options: { profileKeys: [profile.key] },
      },
    }
  )

  response.json({ result })
}
