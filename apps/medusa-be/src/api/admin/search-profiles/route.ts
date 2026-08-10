import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  getSearchProfileService,
  toSearchProfileResponse,
  toSearchProfileWriteInput,
  validateProfileChange,
  validateSalesChannelIds,
} from "./utils"
import type { AdminSearchProfileInputSchemaType } from "./validators"

const getSearchProfiles = async (
  request: MedusaRequest,
  response: MedusaResponse,
) => {
  const service = getSearchProfileService(request.scope)
  const profiles = await service.listConfiguredProfiles()

  response.json({ profiles: profiles.map(toSearchProfileResponse) })
}

const createSearchProfile = async (
  request: MedusaRequest<AdminSearchProfileInputSchemaType>,
  response: MedusaResponse,
) => {
  const service = getSearchProfileService(request.scope)
  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const input = toSearchProfileWriteInput(request.validatedBody)

  await validateSalesChannelIds(query, input.sales_channel_ids)
  await validateProfileChange({ input, service })

  const created = await service.createConfiguredProfile(input)
  await service.invalidateRuntimeProfileCache()

  response.status(201).json({ profile: toSearchProfileResponse(created) })
}

export { getSearchProfiles as GET, createSearchProfile as POST }
