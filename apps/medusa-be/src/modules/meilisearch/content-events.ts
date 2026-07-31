import type { Logger, MedusaContainer } from '@medusajs/framework/types'
import { MeilisearchAdminClient } from './admin-client'
import { buildContentSearchDocument, cleanSearchText } from './documents'
import { isMeilisearchEnabled } from './env'
import { loadSearchProfiles } from './profiles'
import { CONTENT_INDEX_SETTINGS } from './settings'

export type CmsSearchChange = {
	collection: string
	doc?: Record<string, unknown>
	operation?: string
}

const SEARCHABLE_COLLECTION_TYPES = {
	articles: 'article',
	pages: 'page'
} as const

const normalizeLocale = (value: string): string => value.trim().toLowerCase().replaceAll('_', '-').split('-')[0] ?? ''

const isPublished = (change: CmsSearchChange, type: 'article' | 'page'): boolean => change.operation !== 'delete' && change.doc?.status === 'published' && (type === 'article' || change.doc?.visibility === 'public')

export const reconcileContentSearchChange = async (change: CmsSearchChange, logger: Logger, container: MedusaContainer): Promise<void> => {
	if (!isMeilisearchEnabled()) {
		return
	}

	const type = SEARCHABLE_COLLECTION_TYPES[change.collection as keyof typeof SEARCHABLE_COLLECTION_TYPES]

	if (!type) {
		return
	}

	const rawId = change.doc?.id

	if ((typeof rawId !== 'string' || !rawId.trim()) && (typeof rawId !== 'number' || !Number.isFinite(rawId))) {
		logger.warn('Skipping ' + change.collection + ' search projection because the document id is missing')

		return
	}

	const locale = typeof change.doc?.locale === 'string' ? normalizeLocale(change.doc.locale) : undefined
	const profiles = (await loadSearchProfiles(container)).filter((profile) => !locale || normalizeLocale(profile.locale) === locale)
	const client = new MeilisearchAdminClient()
	const documentId = type + '_' + String(rawId)

	for (const profile of profiles) {
		const index = profile.indexes.content

		await client.ensureIndex(index)
		await client.updateSettings(index, CONTENT_INDEX_SETTINGS as Record<string, unknown>)

		if (isPublished(change, type)) {
			const contentSource = {
				...change.doc,
				slug: typeof change.doc?.slug === 'string' ? cleanSearchText(change.doc.slug) : change.doc?.slug
			}

			const document = buildContentSearchDocument(contentSource, type, profile.locale)

			await client.addDocuments(index, [document])
		} else {
			await client.deleteDocuments(index, [documentId])
		}
	}
}
