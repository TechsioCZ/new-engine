import { validateAndTransformBody } from '@medusajs/framework'
import type { MiddlewareRoute } from '@medusajs/framework/http'
import { AdminSearchProfileInputSchema, AdminSearchProfileSyncSchema, AdminSearchProfileTestSchema } from './validators'

export const adminSearchProfileRoutesMiddlewares: MiddlewareRoute[] = [
	{
		methods: ['POST'],
		matcher: '/admin/search-profiles',
		middlewares: [validateAndTransformBody(AdminSearchProfileInputSchema)]
	},
	{
		methods: ['POST'],
		matcher: '/admin/search-profiles/sync',
		middlewares: [validateAndTransformBody(AdminSearchProfileSyncSchema)]
	},
	{
		methods: ['POST'],
		matcher: '/admin/search-profiles/:id',
		middlewares: [validateAndTransformBody(AdminSearchProfileInputSchema)]
	},
	{
		methods: ['POST'],
		matcher: '/admin/search-profiles/:id/sync',
		middlewares: [validateAndTransformBody(AdminSearchProfileSyncSchema)]
	},
	{
		methods: ['POST'],
		matcher: '/admin/search-profiles/:id/test',
		middlewares: [validateAndTransformBody(AdminSearchProfileTestSchema)]
	}
]
