import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  deleteSearchProfileWorkflow,
  updateSearchProfileWorkflow,
} from "../../../../workflows/search-profile/mutate-search-profile"
import {
  getSearchProfileService,
  retrieveSearchProfileOrThrow,
  toSearchProfileResponse,
  toSearchProfileWriteInput,
  validateProfileChange,
  validateSalesChannelIds,
} from "../utils"
import type { AdminSearchProfileInputSchemaType } from "../validators"

export async function GET(request: MedusaRequest, response: MedusaResponse) {
  const service = getSearchProfileService(request.scope)
  const profile = await retrieveSearchProfileOrThrow(
    service,
    request.params.id ?? ""
  )

  response.json({ profile: toSearchProfileResponse(profile) })
}

export async function POST(
  request: MedusaRequest<AdminSearchProfileInputSchemaType>,
  response: MedusaResponse
) {
  const service = getSearchProfileService(request.scope)
  const id = request.params.id ?? ""

  await retrieveSearchProfileOrThrow(service, id)

  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const input = toSearchProfileWriteInput(request.validatedBody)

  await validateSalesChannelIds(query, input.sales_channel_ids)
  await validateProfileChange({ currentId: id, input, service })

  const { result: updated } = await updateSearchProfileWorkflow(
    request.scope
  ).run({ input: { id, profile: input } })

  response.json({ profile: toSearchProfileResponse(updated) })
}

export async function DELETE(request: MedusaRequest, response: MedusaResponse) {
  const service = getSearchProfileService(request.scope)
  const id = request.params.id ?? ""

  await retrieveSearchProfileOrThrow(service, id)

  const { result } = await deleteSearchProfileWorkflow(request.scope).run({
    input: { id },
  })

  response.json(result)
}
