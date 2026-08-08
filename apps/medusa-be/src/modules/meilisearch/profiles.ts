import type { MedusaContainer } from '@medusajs/framework/types'
import { SEARCH_PROFILE_MODULE, type SearchProfileDTO, type SearchProfileModuleService } from '../search-profile'

export const SEARCH_INDEX_TYPES = ['product', 'category', 'brand', 'content'] as const

export type SearchIndexType = (typeof SEARCH_INDEX_TYPES)[number]

export type SearchProfileLimits = {
	autocomplete: Record<SearchIndexType, number>
	fullSearch: number
	page: number
	popular: number
}

export type SearchProfile = {
	availability: 'all' | 'in-stock'
	domain: string
	id?: string
	indexes: Record<SearchIndexType, string>
	key: string
	limits: SearchProfileLimits
	locale: string
	minimumRankingScore: number
	salesChannelIds: string[]
	separateVariantResults: boolean
	shop: string
	strict: boolean
}

type RawSearchProfile = {
	availability?: unknown
	domain?: unknown
	key?: unknown
	limits?: unknown
	locale?: unknown
	minimumRankingScore?: unknown
	salesChannelIds?: unknown
	separateVariantResults?: unknown
	shop?: unknown
	strict?: unknown
}

export type SearchProfileSelection = {
	locale?: string
	requestedKey?: string
	salesChannelIds?: string[]
}

export class SearchProfileConfigurationError extends Error {}

export class SearchProfileResolutionError extends Error {}

const DEFAULT_AUTOCOMPLETE_LIMITS: Record<SearchIndexType, number> = {
	product: 6,
	category: 3,
	brand: 3,
	content: 3
}

const DEFAULT_PROFILE: SearchProfile = {
	availability: 'all',
	domain: 'default',

	indexes: {
		product: 'product_default_default_default',
		category: 'category_default_default_default',
		brand: 'brand_default_default_default',
		content: 'content_default_default_default'
	},

	key: 'default',

	limits: {
		autocomplete: DEFAULT_AUTOCOMPLETE_LIMITS,
		fullSearch: 500,
		page: 100,
		popular: 12
	},

	locale: 'default',
	minimumRankingScore: 0,
	salesChannelIds: [],
	separateVariantResults: false,
	shop: 'default',
	strict: false
}

const normalizeSegment = (value: string, field: string): string => {
	const normalized = value
		.trim()
		.toLowerCase()
		.normalize('NFKD')
		.replaceAll(/\p{Diacritic}/gu, '')
		.replaceAll(/[^a-z0-9_-]+/g, '-')
		.replaceAll(/-+/g, '-')
		.replaceAll(/^-|-$/g, '')

	if (!normalized) {
		throw new SearchProfileConfigurationError('Meilisearch search profile ' + field + ' must contain an index-safe value')
	}

	return normalized
}

const readRequiredString = (value: unknown, field: string, profileIndex: number): string => {
	if (typeof value !== 'string' || !value.trim()) {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + profileIndex + '].' + field + ' must be a non-empty string')
	}

	return value.trim()
}

const readBoolean = (value: unknown, fallback: boolean, field: string, profileIndex: number): boolean => {
	if (value === undefined) {
		return fallback
	}

	if (typeof value !== 'boolean') {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + profileIndex + '].' + field + ' must be a boolean')
	}

	return value
}

const readLimitedInteger = (options: { fallback: number; field: string; maximum: number; profileIndex: number; value: unknown }): number => {
	if (options.value === undefined) {
		return options.fallback
	}

	if (typeof options.value !== 'number' || !Number.isInteger(options.value) || options.value < 1 || options.value > options.maximum) {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + options.profileIndex + '].' + options.field + ' must be an integer between 1 and ' + options.maximum)
	}

	return options.value
}

const readRankingScore = (value: unknown, strict: boolean, profileIndex: number): number => {
	if (value === undefined) {
		return strict ? 0.98 : 0.55
	}

	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + profileIndex + '].minimumRankingScore must be between 0 and 1')
	}

	return value
}

const readAvailability = (value: unknown, profileIndex: number): SearchProfile['availability'] => {
	if (value === undefined) {
		return 'all'
	}

	if (value === 'all' || value === 'in-stock') {
		return value
	}

	throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + profileIndex + '].availability must be "all" or "in-stock"')
}

const readStringArray = (value: unknown, field: string, profileIndex: number): string[] => {
	if (value === undefined) {
		return []
	}

	if (!Array.isArray(value)) {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + profileIndex + '].' + field + ' must be an array')
	}

	return Array.from(
		new Set(
			value.map((entry) => {
				if (typeof entry !== 'string' || !entry.trim()) {
					throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + profileIndex + '].' + field + ' must contain only non-empty strings')
				}

				return entry.trim()
			})
		)
	)
}

const createIndexNames = (shop: string, domain: string, locale: string): Record<SearchIndexType, string> => Object.fromEntries(SEARCH_INDEX_TYPES.map((type) => [type, type + '_' + shop + '_' + domain + '_' + locale])) as Record<SearchIndexType, string>

const readLimits = (value: unknown, profileIndex: number): SearchProfileLimits => {
	const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
	const rawAutocomplete = raw.autocomplete && typeof raw.autocomplete === 'object' && !Array.isArray(raw.autocomplete) ? (raw.autocomplete as Record<string, unknown>) : {}

	return { autocomplete: Object.fromEntries(SEARCH_INDEX_TYPES.map((type) => [ type, readLimitedInteger({ value: rawAutocomplete[type], fallback: DEFAULT_AUTOCOMPLETE_LIMITS[type], field: 'limits.autocomplete.' + type, profileIndex: profileIndex, maximum: 24 }) ])) as Record<SearchIndexType, number>, fullSearch: readLimitedInteger({ value: raw.fullSearch, fallback: 500, field: 'limits.fullSearch', profileIndex: profileIndex, maximum: 1000 }), page: readLimitedInteger({ value: raw.page, fallback: 100, field: 'limits.page', profileIndex: profileIndex, maximum: 100 }), popular: readLimitedInteger({ value: raw.popular, fallback: 12, field: 'limits.popular', profileIndex: profileIndex, maximum: 48 }) }
}

const parseProfile = (rawProfile: RawSearchProfile, profileIndex: number): SearchProfile => {
	const shop = normalizeSegment(readRequiredString(rawProfile.shop, 'shop', profileIndex), 'shop')
	const domain = normalizeSegment(readRequiredString(rawProfile.domain, 'domain', profileIndex), 'domain')
	const locale = normalizeSegment(readRequiredString(rawProfile.locale, 'locale', profileIndex), 'locale')
	const strict = readBoolean(rawProfile.strict, false, 'strict', profileIndex)
	const key = normalizeSegment(typeof rawProfile.key === 'string' && rawProfile.key.trim() ? rawProfile.key : shop + '-' + domain + '-' + locale, 'key')

	return {
		availability: readAvailability(rawProfile.availability, profileIndex),
		domain: domain,
		indexes: createIndexNames(shop, domain, locale),
		key: key,
		limits: readLimits(rawProfile.limits, profileIndex),
		locale: locale,
		minimumRankingScore: readRankingScore(rawProfile.minimumRankingScore, strict, profileIndex),
		salesChannelIds: readStringArray(rawProfile.salesChannelIds, 'salesChannelIds', profileIndex),
		separateVariantResults: readBoolean(rawProfile.separateVariantResults, false, 'separateVariantResults', profileIndex),
		shop: shop,
		strict: strict
	}
}

const parseProfilesJson = (value: string): unknown[] => {
	let parsed: unknown

	try {
		parsed = JSON.parse(value)
	} catch (error) {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES must be valid JSON: ' + (error instanceof Error ? error.message : String(error)))
	}

	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES must be a non-empty JSON array')
	}

	return parsed
}

const parseProfileEntry = (entry: unknown, index: number): SearchProfile => {
	if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
		throw new SearchProfileConfigurationError('MEILISEARCH_SEARCH_PROFILES[' + index + '] must be an object')
	}

	return parseProfile(entry as RawSearchProfile, index)
}

export const parseSearchProfileConfiguration = (entry: unknown, index = 0): SearchProfile => parseProfileEntry(entry, index)

const assertUniqueProfileValues = (profiles: SearchProfile[], describe: (profile: SearchProfile) => string, label: string) => {
	const seen = new Set<string>()

	for (const profile of profiles) {
		const value = describe(profile)

		if (seen.has(value)) {
			throw new SearchProfileConfigurationError('Duplicate Meilisearch ' + label + ': ' + value)
		}

		seen.add(value)
	}
}

export const validateSearchProfileSet = (profiles: SearchProfile[]) => {
	assertUniqueProfileValues(profiles, (profile) => profile.key, 'profile key')
	assertUniqueProfileValues(profiles, (profile) => profile.shop + ':' + profile.domain + ':' + profile.locale, 'shop/domain/locale profile')

	if (profiles.length > 1 && profiles.some((profile) => profile.salesChannelIds.length === 0)) {
		throw new SearchProfileConfigurationError('Every Meilisearch search profile must declare salesChannelIds when more than one domain profile is configured')
	}
}

export const readSearchProfiles = (env: NodeJS.ProcessEnv = process.env): SearchProfile[] => {
	const value = env.MEILISEARCH_SEARCH_PROFILES?.trim()

	if (!value) {
		return [DEFAULT_PROFILE]
	}

	const profiles = parseProfilesJson(value).map(parseProfileEntry)

	validateSearchProfileSet(profiles)

	return profiles
}

export const persistedSearchProfileToRuntime = (profile: SearchProfileDTO, profileIndex = 0): SearchProfile => ({
	...parseProfile(
        {
            availability: profile.availability,
            domain: profile.domain,
            key: profile.key,

            limits: {
                autocomplete: {
                    product: profile.autocomplete_product_limit,
                    category: profile.autocomplete_category_limit,
                    brand: profile.autocomplete_brand_limit,
                    content: profile.autocomplete_content_limit
                },

                fullSearch: profile.full_search_limit,
                page: profile.max_results_per_page,
                popular: profile.popular_limit
            },

            locale: profile.locale,
            minimumRankingScore: profile.minimum_ranking_score ?? undefined,
            salesChannelIds: profile.sales_channel_ids,
            separateVariantResults: profile.separate_variant_results,
            shop: profile.shop,
            strict: profile.strict
        },

		profileIndex
    ),

	id: profile.id
})

export const loadSearchProfiles = async (container: MedusaContainer): Promise<SearchProfile[]> => {
	let service: SearchProfileModuleService

	try {
		service = container.resolve<SearchProfileModuleService>(SEARCH_PROFILE_MODULE)
	} catch {
		return []
	}

	if (typeof service.listConfiguredProfiles !== 'function') {
		return []
	}

	const persisted = typeof service.listRuntimeProfiles === 'function' ? await service.listRuntimeProfiles() : await service.listConfiguredProfiles({ enabledOnly: true })

	if (persisted.length === 0) {
		return []
	}

	const profiles = persisted.map(persistedSearchProfileToRuntime)

	validateSearchProfileSet(profiles)

	return profiles
}

const normalizeLocale = (value: string): string => value.trim().toLowerCase().replaceAll('_', '-').split('-')[0] ?? ''

const hasSalesChannelAccess = (profile: SearchProfile, salesChannelIds: string[]): boolean => profile.salesChannelIds.some((id) => salesChannelIds.includes(id))

const sortProfilesByKey = (profiles: SearchProfile[]): SearchProfile[] => [...profiles].sort((left, right) => left.key.localeCompare(right.key))

export const resolveSearchProfile = (selection: SearchProfileSelection, profiles: SearchProfile[] = []): SearchProfile => {
	const salesChannelIds = selection.salesChannelIds ?? []
	const requestedKey = selection.requestedKey?.trim().toLowerCase()

	if (requestedKey) {
		const profile = profiles.find((entry) => entry.key === requestedKey)

		if (!profile) {
			throw new SearchProfileResolutionError('Unknown Meilisearch search profile: ' + requestedKey)
		}

		if (!hasSalesChannelAccess(profile, salesChannelIds)) {
			throw new SearchProfileResolutionError('Search profile ' + requestedKey + ' is not available for this storefront')
		}

		return profile
	}

	const requestedLocale = selection.locale ? normalizeLocale(selection.locale) : undefined
	const accessible = profiles.filter((profile) => hasSalesChannelAccess(profile, salesChannelIds))
	const localized = requestedLocale ? accessible.filter((profile) => normalizeLocale(profile.locale) === requestedLocale) : accessible
	const candidates = requestedLocale ? localized : accessible

	if (candidates.length > 0) {
		return sortProfilesByKey(candidates)[0] as SearchProfile
	}

	throw new SearchProfileResolutionError('No Meilisearch profile is assigned to this storefront Sales Channel and language')
}
