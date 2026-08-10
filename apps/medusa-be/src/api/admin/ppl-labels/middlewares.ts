import type { MiddlewareRoute } from '@medusajs/framework/http'
import { validateAndTransformBody } from '@medusajs/framework/http'
import { PostAdminPPLLabelsSchema } from './validators'

export const adminPPLLabelsRoutesMiddlewares: MiddlewareRoute[] = [
	{
		methods: ['POST'],
		matcher: '/admin/ppl-labels',
		middlewares: [validateAndTransformBody(PostAdminPPLLabelsSchema)]
	}
]
