import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MeilisearchAdminClient } from '../../../../modules/meilisearch/admin-client'
import { isMeilisearchEnabled } from '../../../../modules/meilisearch/env'

export async function GET(_request: MedusaRequest, response: MedusaResponse) {
	if (!isMeilisearchEnabled()) {
		response.json({ enabled: false, connected: false, status: 'disabled' })

		return
	}

	try {
		const health = await new MeilisearchAdminClient().health()

		response.json({ enabled: true, connected: health.status === 'available', status: health.status ?? 'unknown' })
	} catch (error) {
		response.json({ enabled: true, connected: false, status: 'unavailable', error: error instanceof Error ? error.message : String(error) })
	}
}
