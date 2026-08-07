import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import type { Query } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getSearchProfileService, retrieveSearchProfileOrThrow, toSearchProfileResponse, toSearchProfileWriteInput, updateStoredSearchProfile, validateProfileChange, validateSalesChannelIds } from '../utils'
import type { AdminSearchProfileInputSchemaType } from '../validators'

export async function GET(request: MedusaRequest, response: MedusaResponse) {
	const service = getSearchProfileService(request.scope)
	const profile = await retrieveSearchProfileOrThrow(service, request.params.id ?? '')

	response.json({ profile: toSearchProfileResponse(profile) })
}

export async function POST(request: MedusaRequest<AdminSearchProfileInputSchemaType>, response: MedusaResponse) {
	const service = getSearchProfileService(request.scope)
	const id = request.params.id ?? ''

	await retrieveSearchProfileOrThrow(service, id)

	const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
	const input = toSearchProfileWriteInput(request.validatedBody)

	await validateSalesChannelIds(query, input.sales_channel_ids)
	await validateProfileChange({ currentId: id, input: input, service: service })

	const updated = await updateStoredSearchProfile(service, id, input)

	await service.invalidateRuntimeProfileCache()

	response.json({ profile: toSearchProfileResponse(updated) })
}

export async function DELETE(request: MedusaRequest, response: MedusaResponse) {
	const service = getSearchProfileService(request.scope)
	const id = request.params.id ?? ''

	await retrieveSearchProfileOrThrow(service, id)

	await service.deleteSearchProfiles(id)
	await service.invalidateRuntimeProfileCache()

	response.json({ deleted: true, id: id, object: 'search_profile' })
}
