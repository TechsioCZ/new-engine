import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { activatePacketaProfileWorkflow } from '../../../../workflows/packeta-config/activate-packeta-profile'
import type { PostAdminPacketaActiveProfileSchemaType } from '../validators'

export async function POST(request: MedusaRequest<PostAdminPacketaActiveProfileSchemaType>, response: MedusaResponse) {
	const { result } = await activatePacketaProfileWorkflow(request.scope).run({ input: request.validatedBody })
	response.json({ active_environment: result.environment })
}
