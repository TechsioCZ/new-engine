import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { GLS_CLIENT_MODULE, type GLSClientModuleService } from '../../../../modules/gls-client'
import type { PostAdminGLSActiveProfileSchemaType } from '../validators'

export async function POST(request: MedusaRequest<PostAdminGLSActiveProfileSchemaType>, response: MedusaResponse) {
	const glsService = request.scope.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)
	const result = await glsService.activateConfig(request.validatedBody.environment, request.validatedBody.confirmed)

	response.json({ active_environment: result.environment })
}
