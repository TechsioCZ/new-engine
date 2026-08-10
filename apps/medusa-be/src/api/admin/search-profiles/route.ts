import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type { SearchProfileDTO } from '../../../modules/search-profile'
import { getSearchProfileService, toSearchProfileResponse, toSearchProfileWriteInput, validateProfileChange, validateSalesChannelIds } from './utils'
import type { AdminSearchProfileInputSchemaType } from './validators'

export async function GET(request: MedusaRequest, response: MedusaResponse) {
	const service = getSearchProfileService(request.scope)
	const profiles = await service.listConfiguredProfiles()

	response.json({ profiles: profiles.map(toSearchProfileResponse) })
}

export async function POST(request: MedusaRequest<AdminSearchProfileInputSchemaType>, response: MedusaResponse) {
	const service = getSearchProfileService(request.scope)
	const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
	const input = toSearchProfileWriteInput(request.validatedBody)

	await validateSalesChannelIds(query, input.sales_channel_ids)
	await validateProfileChange({ input, service })

	const created = (await service.createSearchProfiles(input)) as unknown as SearchProfileDTO

	await service.invalidateRuntimeProfileCache()

	response.status(201).json({ profile: toSearchProfileResponse(created) })
}
