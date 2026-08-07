import type { ICachingModuleService } from '@medusajs/framework/types'
import { MedusaService, Modules } from '@medusajs/framework/utils'
import { safeResolve } from '../../utils/safe-resolve'
import SearchProfile from './models/search-profile'
import type { SearchProfileDTO } from './types'

const RUNTIME_PROFILES_CACHE_KEY = 'search-profile:runtime:enabled'
const RUNTIME_PROFILES_CACHE_TTL_SECONDS = 30

type InjectedDependencies = {
	[Modules.CACHING]?: ICachingModuleService
}

class SearchProfileModuleService extends MedusaService({ SearchProfile }) {
	private readonly cacheService_: ICachingModuleService | null

	constructor(container: InjectedDependencies) {
		super(container)

		this.cacheService_ = safeResolve<ICachingModuleService>(container, Modules.CACHING)
	}

	async listConfiguredProfiles(options?: { enabledOnly?: boolean }): Promise<SearchProfileDTO[]> {
		const profiles = await this.listSearchProfiles({}, { order: { shop: 'ASC', domain: 'ASC', locale: 'ASC', key: 'ASC' } })
		const configuredProfiles = profiles as unknown as SearchProfileDTO[]

		return options?.enabledOnly ? configuredProfiles.filter((profile) => Array.isArray(profile.sales_channel_ids) && profile.sales_channel_ids.length > 0) : configuredProfiles
	}

	async listRuntimeProfiles(): Promise<SearchProfileDTO[]> {
		if (this.cacheService_) {
			const cached = await this.cacheService_.get({ key: RUNTIME_PROFILES_CACHE_KEY })

			if (Array.isArray(cached)) {
				return cached as SearchProfileDTO[]
			}
		}

		const profiles = await this.listConfiguredProfiles({ enabledOnly: true })

		if (this.cacheService_) {
			await this.cacheService_.set({
				key: RUNTIME_PROFILES_CACHE_KEY,
				data: profiles,
				tags: [],
				ttl: RUNTIME_PROFILES_CACHE_TTL_SECONDS,
				options: { autoInvalidate: false }
			})
		}

		return profiles
	}

	async invalidateRuntimeProfileCache(): Promise<void> {
		await this.cacheService_?.clear({ key: RUNTIME_PROFILES_CACHE_KEY })
	}
}

export default SearchProfileModuleService
