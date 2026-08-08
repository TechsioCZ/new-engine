import type { MedusaContainer } from '@medusajs/framework/types'
import { synchronizeSearchProfiles } from '../modules/meilisearch/synchronize'

export default async function meilisearchNormalSyncJob(container: MedusaContainer) {
	await synchronizeSearchProfiles(container, 'normal')
}

export const config = {
	name: 'meilisearch-normal-sync',
	schedule: '0 */4 * * *'
}
