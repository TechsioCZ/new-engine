import type { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  readSearchProfiles,
  type SearchProfile,
} from "../../meilisearch/profiles"

type InternalSearchProfileService = {
  create: (data: Record<string, unknown>) => Promise<unknown>
  listAndCount: (
    filter: Record<string, unknown>
  ) => Promise<[unknown[], number]>
}

const toBootstrapRecord = (profile: SearchProfile) => {
  const automaticRankingScore = profile.strict ? 0.98 : 0.55

  return {
    key: profile.key,
    shop: profile.shop,
    domain: profile.domain,
    locale: profile.locale,
    sales_channel_ids: profile.salesChannelIds,
    strict: profile.strict,
    separate_variant_results: profile.separateVariantResults,
    minimum_ranking_score:
      profile.minimumRankingScore === automaticRankingScore
        ? null
        : profile.minimumRankingScore,
    availability: profile.availability,
    autocomplete_product_limit: profile.limits.autocomplete.product,
    autocomplete_category_limit: profile.limits.autocomplete.category,
    autocomplete_brand_limit: profile.limits.autocomplete.brand,
    autocomplete_content_limit: profile.limits.autocomplete.content,
    full_search_limit: profile.limits.fullSearch,
    max_results_per_page: profile.limits.page,
    popular_limit: profile.limits.popular,
  }
}

export default async function bootstrapSearchProfiles({
  container,
}: LoaderOptions) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service = container.resolve<InternalSearchProfileService>(
    "searchProfileService"
  )
  const [, count] = await service.listAndCount({})

  if (count > 0) {
    return
  }

  if (!process.env.MEILISEARCH_SEARCH_PROFILES?.trim()) {
    logger.info(
      "Meilisearch: no search profiles configured; create one in Medusa Admin"
    )

    return
  }

  const profiles = readSearchProfiles()

  for (const profile of profiles) {
    try {
      await service.create(toBootstrapRecord(profile))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (
        message.includes("unique constraint") ||
        message.includes("duplicate key")
      ) {
        continue
      }

      throw error
    }
  }

  logger.info(
    `Meilisearch: bootstrapped ${profiles.length} search profile(s) into Medusa`
  )
}
