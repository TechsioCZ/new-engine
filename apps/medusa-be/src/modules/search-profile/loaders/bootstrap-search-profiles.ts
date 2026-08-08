import type { LoaderOptions, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z as zod } from "@medusajs/framework/zod"

import { MAX_SEARCH_PROFILES } from "../types"

const MAX_BOOTSTRAP_SALES_CHANNELS = 100

const bootstrapSearchProfileSchema = zod.object({
  availability: zod.enum(["all", "in-stock"]),
  domain: zod.string(),
  key: zod.string(),
  limits: zod.object({
    autocomplete: zod.object({
      brand: zod.number(),
      category: zod.number(),
      content: zod.number(),
      product: zod.number(),
    }),
    fullSearch: zod.number(),
    page: zod.number(),
    popular: zod.number(),
  }),
  locale: zod.string(),
  minimumRankingScore: zod.number(),
  salesChannelIds: zod.array(zod.string()),
  separateVariantResults: zod.boolean(),
  shop: zod.string(),
  strict: zod.boolean(),
})

const bootstrapSearchProfilesSchema = zod
  .array(bootstrapSearchProfileSchema)
  .max(MAX_SEARCH_PROFILES)
const existingProfileSchema = zod.object({ key: zod.string() })
const salesChannelSchema = zod.object({ id: zod.string() })

interface ProfileReaderModule {
  readSearchProfiles: () => unknown
}

const isProfileReaderModule = (value: unknown): value is ProfileReaderModule =>
  typeof value === "object" &&
  value !== null &&
  "readSearchProfiles" in value &&
  typeof value.readSearchProfiles === "function"

export interface InternalSearchProfileService {
  create: (data: Record<string, unknown>) => Promise<unknown>
  listAndCount: (
    filter: Record<string, unknown>,
    options?: { take?: number },
  ) => Promise<[unknown[], number]>
}

export type BootstrapSearchProfile = zod.infer<
  typeof bootstrapSearchProfileSchema
>

const toBootstrapRecord = (profile: BootstrapSearchProfile) => {
  const automaticRankingScore = profile.strict ? 0.98 : 0.55

  return {
    autocomplete_brand_limit: profile.limits.autocomplete.brand,
    autocomplete_category_limit: profile.limits.autocomplete.category,
    autocomplete_content_limit: profile.limits.autocomplete.content,
    autocomplete_product_limit: profile.limits.autocomplete.product,
    availability: profile.availability,
    domain: profile.domain,
    full_search_limit: profile.limits.fullSearch,
    key: profile.key,
    locale: profile.locale,
    max_results_per_page: profile.limits.page,
    minimum_ranking_score:
      profile.minimumRankingScore === automaticRankingScore
        ? null
        : profile.minimumRankingScore,
    popular_limit: profile.limits.popular,
    sales_channel_ids: { values: profile.salesChannelIds },
    separate_variant_results: profile.separateVariantResults,
    shop: profile.shop,
    strict: profile.strict,
  }
}

const readDefaultSalesChannelIds = async (query: Query): Promise<string[]> => {
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    pagination: { skip: 0, take: MAX_BOOTSTRAP_SALES_CHANNELS + 1 },
  })
  const records = zod.array(salesChannelSchema).parse(data)

  if (records.length > MAX_BOOTSTRAP_SALES_CHANNELS) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Cannot bootstrap the default search profile for more than ${MAX_BOOTSTRAP_SALES_CHANNELS} Sales Channels`,
    )
  }

  return records.map((record) => record.id)
}

const profileExists = async (
  service: InternalSearchProfileService,
  key: string,
): Promise<boolean> => {
  const [, count] = await service.listAndCount({ key }, { take: 1 })
  return count > 0
}

export interface BootstrapLogger {
  info: (message: string) => void
  warn: (message: string) => void
}

export const createMissingBootstrapProfiles = async (options: {
  existingKeys: Set<string>
  logger: BootstrapLogger
  profiles: BootstrapSearchProfile[]
  service: InternalSearchProfileService
}): Promise<number> => {
  const createNext = async (
    profileIndex: number,
    createdCount: number,
  ): Promise<number> => {
    const profile = options.profiles[profileIndex]

    if (profile === undefined) {
      return createdCount
    }

    if (options.existingKeys.has(profile.key)) {
      return await createNext(profileIndex + 1, createdCount)
    }

    try {
      await options.service.create(toBootstrapRecord(profile))
      options.existingKeys.add(profile.key)
      return await createNext(profileIndex + 1, createdCount + 1)
    } catch (error) {
      if (
        !(error instanceof MedusaError) ||
        error.type !== MedusaError.Types.DUPLICATE_ERROR
      ) {
        throw error
      }

      const exists = await profileExists(options.service, profile.key)
      if (!exists) {
        throw error
      }

      options.existingKeys.add(profile.key)
      options.logger.warn(
        `Meilisearch: search profile ${profile.key} was created concurrently; using the persisted profile`,
      )
      return await createNext(profileIndex + 1, createdCount)
    }
  }

  return await createNext(0, 0)
}

export default async function bootstrapSearchProfiles({
  container,
}: LoaderOptions) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service = container.resolve<InternalSearchProfileService>(
    "searchProfileService",
  )
  const serializedProfiles = process.env["MEILISEARCH_SEARCH_PROFILES"]
  const usesOperationalDefault =
    serializedProfiles === undefined || serializedProfiles.trim() === ""

  const profileModule: unknown = await import("../../meilisearch/profiles.js")
  if (!isProfileReaderModule(profileModule)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Meilisearch search profile reader is unavailable",
    )
  }

  let profiles = bootstrapSearchProfilesSchema.parse(
    profileModule.readSearchProfiles(),
  )

  if (usesOperationalDefault) {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const salesChannelIds = await readDefaultSalesChannelIds(query)
    profiles = profiles.map((profile) => ({ ...profile, salesChannelIds }))
  }

  const [rawExistingProfiles, count] = await service.listAndCount(
    {},
    { take: MAX_SEARCH_PROFILES + 1 },
  )

  if (count > MAX_SEARCH_PROFILES) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Search profile limit exceeded; maximum is ${MAX_SEARCH_PROFILES}`,
    )
  }

  const existingProfiles = zod
    .array(existingProfileSchema)
    .max(MAX_SEARCH_PROFILES)
    .parse(rawExistingProfiles)
  const existingKeys = new Set(existingProfiles.map((profile) => profile.key))
  const createdCount = await createMissingBootstrapProfiles({
    existingKeys,
    logger,
    profiles,
    service,
  })

  if (createdCount > 0) {
    logger.info(
      `Meilisearch: bootstrapped ${createdCount} search profile(s) into Medusa`,
    )
  }
}
