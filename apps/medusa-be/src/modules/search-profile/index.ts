import { Module } from '@medusajs/framework/utils'
import bootstrapSearchProfiles from './loaders/bootstrap-search-profiles'
import SearchProfileModuleService from './service'

export const SEARCH_PROFILE_MODULE = 'search_profile'
export default Module(SEARCH_PROFILE_MODULE, { service: SearchProfileModuleService, loaders: [bootstrapSearchProfiles] })
export type { default as SearchProfileModuleService } from './service'

export type {
	SearchProfileDTO,
	SearchProfileWriteInput
} from './types'
