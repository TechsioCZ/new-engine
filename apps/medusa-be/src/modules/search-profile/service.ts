import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  MedusaService,
  Modules,
} from "@medusajs/framework/utils"

import SearchProfile from "./models/search-profile"
import {
  MAX_SEARCH_PROFILES,
  SearchProfileDTOArraySchema,
  SearchProfileDTOSchema,
} from "./types"
import type { SearchProfileDTO, SearchProfileWriteInput } from "./types"

const RUNTIME_PROFILES_CACHE_KEY = "search-profile:runtime:enabled"
const RUNTIME_PROFILES_CACHE_TTL_SECONDS = 30

const toStoredSearchProfileInput = (input: SearchProfileWriteInput) => {
  const { sales_channel_ids: salesChannelIds, ...profile } = input

  return {
    ...profile,
    sales_channel_ids: { values: salesChannelIds },
  }
}

const describeCacheFailure = (operation: string, error: unknown): string =>
  `Search profile cache ${operation} failed; continuing with database truth: ${
    error instanceof Error ? error.message : String(error)
  }`

export type SearchProfileCacheOperationResult<Result> =
  | { succeeded: false }
  | { succeeded: true; value: Result }

export const runSearchProfileCacheOperation = async <Result>(options: {
  action: () => Promise<Result>
  logger: Pick<Logger, "warn">
  operation: string
}): Promise<SearchProfileCacheOperationResult<Result>> => {
  try {
    return { succeeded: true, value: await options.action() }
  } catch (error) {
    options.logger.warn(describeCacheFailure(options.operation, error))
    return { succeeded: false }
  }
}

interface InjectedDependencies {
  [ContainerRegistrationKeys.LOGGER]: Logger
  [Modules.CACHING]?: ICachingModuleService
}

class SearchProfileModuleService extends MedusaService({ SearchProfile }) {
  private readonly cacheService: ICachingModuleService | null
  private readonly logger: Logger

  constructor(container: InjectedDependencies) {
    super(container)
    this.cacheService = container[Modules.CACHING] ?? null
    this.logger = container[ContainerRegistrationKeys.LOGGER]
  }

  async createConfiguredProfile(
    input: SearchProfileWriteInput,
  ): Promise<SearchProfileDTO> {
    const created: unknown = await this.createSearchProfiles(
      toStoredSearchProfileInput(input),
    )
    const profile = SearchProfileDTOSchema.parse(created)
    await this.invalidateRuntimeProfileCache()
    return profile
  }

  async deleteConfiguredProfile(id: string): Promise<void> {
    await this.deleteSearchProfiles(id)
    await this.invalidateRuntimeProfileCache()
  }

  async retrieveConfiguredProfile(id: string): Promise<SearchProfileDTO> {
    const profile: unknown = await this.retrieveSearchProfile(id)
    return SearchProfileDTOSchema.parse(profile)
  }

  async updateConfiguredProfile(
    id: string,
    input: SearchProfileWriteInput,
  ): Promise<SearchProfileDTO> {
    const updated: unknown = await this.updateSearchProfiles({
      id,
      ...toStoredSearchProfileInput(input),
    })
    const profile = SearchProfileDTOSchema.parse(updated)
    await this.invalidateRuntimeProfileCache()
    return profile
  }

  async listConfiguredProfiles(options?: {
    enabledOnly?: boolean
  }): Promise<SearchProfileDTO[]> {
    const profiles: unknown = await this.listSearchProfiles(
      {},
      {
        order: { domain: "ASC", key: "ASC", locale: "ASC", shop: "ASC" },
        take: MAX_SEARCH_PROFILES + 1,
      },
    )
    const unboundedProfiles = SearchProfileDTOSchema.array().parse(profiles)

    if (unboundedProfiles.length > MAX_SEARCH_PROFILES) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Search profile limit exceeded; maximum is ${MAX_SEARCH_PROFILES}`,
      )
    }

    const configuredProfiles =
      SearchProfileDTOArraySchema.parse(unboundedProfiles)

    return options?.enabledOnly === true
      ? configuredProfiles.filter(
          (profile) => profile.sales_channel_ids.length > 0,
        )
      : configuredProfiles
  }

  async listRuntimeProfiles(): Promise<SearchProfileDTO[]> {
    const { cacheService } = this
    if (cacheService !== null) {
      const cached = await runSearchProfileCacheOperation({
        action: async (): Promise<unknown> => {
          const value: unknown = await cacheService.get({
            key: RUNTIME_PROFILES_CACHE_KEY,
          })
          return value
        },
        logger: this.logger,
        operation: "read",
      })
      const parsed = SearchProfileDTOArraySchema.safeParse(
        cached.succeeded ? cached.value : undefined,
      )

      if (parsed.success) {
        return parsed.data
      }
    }

    const profiles = await this.listConfiguredProfiles({ enabledOnly: true })

    if (cacheService !== null) {
      await runSearchProfileCacheOperation({
        action: async (): Promise<void> => {
          await cacheService.set({
            data: profiles,
            key: RUNTIME_PROFILES_CACHE_KEY,
            options: { autoInvalidate: false },
            tags: [],
            ttl: RUNTIME_PROFILES_CACHE_TTL_SECONDS,
          })
        },
        logger: this.logger,
        operation: "write",
      })
    }

    return profiles
  }

  async invalidateRuntimeProfileCache(): Promise<void> {
    if (this.cacheService === null) {
      return
    }

    const { cacheService } = this
    await runSearchProfileCacheOperation({
      action: async (): Promise<void> => {
        await cacheService.clear({ key: RUNTIME_PROFILES_CACHE_KEY })
      },
      logger: this.logger,
      operation: "invalidation",
    })
  }
}

export default SearchProfileModuleService
