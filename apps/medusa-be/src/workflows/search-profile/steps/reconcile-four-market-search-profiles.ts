import type {
  ISalesChannelModuleService,
  SalesChannelDTO,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  SEARCH_PROFILE_MODULE,
  type SearchProfileDTO,
  type SearchProfileModuleService,
  type SearchProfileWriteInput,
} from "../../../modules/search-profile"

export const FOUR_MARKET_SEARCH_PROFILE_CONTRACT = [
  {
    currencyCode: "eur",
    domain: "herbatica.sk",
    key: "herbatica-sk",
    locale: "sk-SK",
    marketCode: "sk",
    salesChannelSeedHandle: "herbatica-storefront-sk",
  },
  {
    currencyCode: "czk",
    domain: "herbatica.cz",
    key: "herbatica-cz",
    locale: "cs-CZ",
    marketCode: "cz",
    salesChannelSeedHandle: "herbatica-storefront-cz",
  },
  {
    currencyCode: "huf",
    domain: "herbatica.hu",
    key: "herbatica-hu",
    locale: "hu-HU",
    marketCode: "hu",
    salesChannelSeedHandle: "herbatica-storefront-hu",
  },
  {
    currencyCode: "ron",
    domain: "herbatica.ro",
    key: "herbatica-ro",
    locale: "ro-RO",
    marketCode: "ro",
    salesChannelSeedHandle: "herbatica-storefront-ro",
  },
] as const

type FourMarketSearchProfileContract =
  (typeof FOUR_MARKET_SEARCH_PROFILE_CONTRACT)[number]

type SearchProfileService = SearchProfileModuleService & {
  createSearchProfiles: (
    data: SearchProfileWriteInput
  ) => Promise<SearchProfileDTO>
  deleteSearchProfiles: (ids: string | string[]) => Promise<void>
  updateSearchProfiles: (
    data: SearchProfileWriteInput & { id: string }
  ) => Promise<SearchProfileDTO | SearchProfileDTO[]>
}

type SearchProfileUpdate = {
  id: string
  next: SearchProfileWriteInput
  previous: SearchProfileWriteInput
}

export type FourMarketSearchProfilePlan = {
  creates: SearchProfileWriteInput[]
  profileKeys: string[]
  unchangedProfileIds: string[]
  updates: SearchProfileUpdate[]
}

type ReconciliationCompensation = {
  createdIds: string[]
  updates: Pick<SearchProfileUpdate, "id" | "previous">[]
}

const PROFILE_WRITE_FIELDS = [
  "key",
  "shop",
  "domain",
  "locale",
  "sales_channel_ids",
  "strict",
  "separate_variant_results",
  "minimum_ranking_score",
  "availability",
  "autocomplete_product_limit",
  "autocomplete_category_limit",
  "autocomplete_brand_limit",
  "autocomplete_content_limit",
  "full_search_limit",
  "max_results_per_page",
  "popular_limit",
] as const satisfies readonly (keyof SearchProfileWriteInput)[]

const invalid = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

const profileSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/[^a-z0-9_-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return invalid(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactText = (value: unknown, expected: string, label: string): void => {
  if (value !== expected) {
    invalid(`${label} must equal ${expected}`)
  }
}

const validateSalesChannelAuthority = (
  channel: Pick<SalesChannelDTO, "metadata" | "name">,
  contract: FourMarketSearchProfileContract
): void => {
  const metadata = record(
    channel.metadata,
    `Sales channel ${channel.name} metadata`
  )
  exactText(
    metadata.seed_handle,
    contract.salesChannelSeedHandle,
    `Sales channel ${channel.name} metadata.seed_handle`
  )

  const market = record(
    metadata.herbatica_market,
    `Sales channel ${channel.name} metadata.herbatica_market`
  )
  exactText(
    market.market_code,
    contract.marketCode,
    `Sales channel ${channel.name} market_code`
  )
  exactText(
    market.country_code,
    contract.marketCode,
    `Sales channel ${channel.name} country_code`
  )
  exactText(
    market.currency_code,
    contract.currencyCode,
    `Sales channel ${channel.name} currency_code`
  )
  exactText(
    market.seed_handle,
    contract.salesChannelSeedHandle,
    `Sales channel ${channel.name} market seed_handle`
  )

  const notificationMarkets = record(
    metadata.storefront_notification_markets,
    `Sales channel ${channel.name} metadata.storefront_notification_markets`
  )
  const notificationMarket = record(
    notificationMarkets[contract.marketCode],
    `Sales channel ${channel.name} notification market ${contract.marketCode}`
  )
  exactText(
    notificationMarket.market_code,
    contract.marketCode,
    `Sales channel ${channel.name} notification market_code`
  )
  exactText(
    notificationMarket.country_code,
    contract.marketCode,
    `Sales channel ${channel.name} notification country_code`
  )
  exactText(
    notificationMarket.locale,
    contract.locale,
    `Sales channel ${channel.name} notification locale`
  )
  exactText(
    notificationMarket.storefront_domain,
    contract.domain,
    `Sales channel ${channel.name} notification storefront_domain`
  )
}

const findSalesChannel = (
  salesChannels: Pick<SalesChannelDTO, "id" | "metadata" | "name">[],
  contract: FourMarketSearchProfileContract
) => {
  const matches = salesChannels.filter(
    (candidate) =>
      candidate.metadata?.seed_handle === contract.salesChannelSeedHandle
  )
  if (matches.length !== 1) {
    invalid(
      `Expected exactly one Sales Channel with seed handle ${contract.salesChannelSeedHandle}; found ${matches.length}`
    )
  }
  const channel = matches[0]
  if (!channel) {
    return invalid(
      `Missing Sales Channel with seed handle ${contract.salesChannelSeedHandle}`
    )
  }
  validateSalesChannelAuthority(channel, contract)
  return channel
}

const toWriteInput = (profile: SearchProfileDTO): SearchProfileWriteInput =>
  Object.fromEntries(
    PROFILE_WRITE_FIELDS.map((field) => [field, profile[field]])
  ) as SearchProfileWriteInput

const desiredProfile = (
  contract: FourMarketSearchProfileContract,
  salesChannelId: string
): SearchProfileWriteInput => ({
  key: contract.key,
  shop: "herbatica",
  domain: contract.domain,
  locale: contract.locale,
  sales_channel_ids: [salesChannelId],
  strict: true,
  separate_variant_results: false,
  minimum_ranking_score: null,
  availability: "in-stock",
  autocomplete_product_limit: 6,
  autocomplete_category_limit: 3,
  autocomplete_brand_limit: 3,
  autocomplete_content_limit: 3,
  full_search_limit: 500,
  max_results_per_page: 100,
  popular_limit: 12,
})

const sameWriteInput = (
  left: SearchProfileWriteInput,
  right: SearchProfileWriteInput
): boolean =>
  PROFILE_WRITE_FIELDS.every((field) => {
    if (field === "sales_channel_ids") {
      return (
        left.sales_channel_ids.length === right.sales_channel_ids.length &&
        left.sales_channel_ids.every(
          (salesChannelId, index) =>
            salesChannelId === right.sales_channel_ids[index]
        )
      )
    }
    return left[field] === right[field]
  })

const matchesContract = (
  profile: SearchProfileDTO,
  contract: FourMarketSearchProfileContract
): boolean =>
  profileSegment(profile.key) === profileSegment(contract.key) ||
  (profileSegment(profile.shop) === "herbatica" &&
    profileSegment(profile.domain) === profileSegment(contract.domain) &&
    profileSegment(profile.locale) === profileSegment(contract.locale))

const findExistingProfile = (
  existingProfiles: SearchProfileDTO[],
  contract: FourMarketSearchProfileContract
): SearchProfileDTO | undefined => {
  const matches = existingProfiles.filter((profile) =>
    matchesContract(profile, contract)
  )
  if (matches.length > 1) {
    invalid(`Ambiguous SearchProfile identity for ${contract.key}`)
  }
  return matches[0]
}

export function planFourMarketSearchProfileReconciliation(
  salesChannels: Pick<SalesChannelDTO, "id" | "metadata" | "name">[],
  existingProfiles: SearchProfileDTO[]
): FourMarketSearchProfilePlan {
  const channels = FOUR_MARKET_SEARCH_PROFILE_CONTRACT.map((contract) => ({
    channel: findSalesChannel(salesChannels, contract),
    contract,
  }))
  const salesChannelIds = channels.map(({ channel }) => channel.id)
  if (new Set(salesChannelIds).size !== channels.length) {
    invalid("Four-market Sales Channel bindings must be exclusive")
  }

  const claimedProfileIds = new Set<string>()
  const creates: SearchProfileWriteInput[] = []
  const updates: SearchProfileUpdate[] = []
  const unchangedProfileIds: string[] = []

  for (const { channel, contract } of channels) {
    const existing = findExistingProfile(existingProfiles, contract)
    const next = desiredProfile(contract, channel.id)
    if (!existing) {
      creates.push(next)
      continue
    }
    if (claimedProfileIds.has(existing.id)) {
      invalid(`SearchProfile ${existing.id} matches multiple markets`)
    }
    claimedProfileIds.add(existing.id)
    const previous = toWriteInput(existing)
    if (sameWriteInput(previous, next)) {
      unchangedProfileIds.push(existing.id)
    } else {
      updates.push({ id: existing.id, next, previous })
    }
  }

  const claimedSalesChannelIds = new Set(salesChannelIds)
  for (const profile of existingProfiles) {
    if (claimedProfileIds.has(profile.id)) {
      continue
    }
    const previous = toWriteInput(profile)
    const nextSalesChannelIds = previous.sales_channel_ids.filter(
      (salesChannelId) => !claimedSalesChannelIds.has(salesChannelId)
    )
    if (nextSalesChannelIds.length === previous.sales_channel_ids.length) {
      continue
    }
    updates.push({
      id: profile.id,
      next: { ...previous, sales_channel_ids: nextSalesChannelIds },
      previous,
    })
  }

  return {
    creates,
    profileKeys: FOUR_MARKET_SEARCH_PROFILE_CONTRACT.map(({ key }) => key),
    unchangedProfileIds,
    updates,
  }
}

const rollback = async (
  service: SearchProfileService,
  compensation: ReconciliationCompensation
): Promise<void> => {
  if (compensation.createdIds.length) {
    await service.deleteSearchProfiles(compensation.createdIds)
  }
  for (const update of [...compensation.updates].reverse()) {
    await service.updateSearchProfiles({ id: update.id, ...update.previous })
  }
  await service.invalidateRuntimeProfileCache()
}

export const reconcileFourMarketSearchProfilesStep = createStep(
  "reconcile-four-market-search-profiles",
  async (_input: Record<string, never>, { container }) => {
    const salesChannelService = container.resolve<ISalesChannelModuleService>(
      Modules.SALES_CHANNEL
    )
    const searchProfileService = container.resolve<SearchProfileService>(
      SEARCH_PROFILE_MODULE
    )
    const [salesChannels, existingProfiles] = await Promise.all([
      salesChannelService.listSalesChannels({}, { take: 1000 }),
      searchProfileService.listConfiguredProfiles(),
    ])
    const plan = planFourMarketSearchProfileReconciliation(
      salesChannels,
      existingProfiles
    )
    const compensation: ReconciliationCompensation = {
      createdIds: [],
      updates: [],
    }

    try {
      for (const update of plan.updates) {
        await searchProfileService.updateSearchProfiles({
          id: update.id,
          ...update.next,
        })
        compensation.updates.push({
          id: update.id,
          previous: update.previous,
        })
      }
      for (const profile of plan.creates) {
        const created = await searchProfileService.createSearchProfiles(profile)
        compensation.createdIds.push(created.id)
      }
      await searchProfileService.invalidateRuntimeProfileCache()
    } catch (error) {
      await rollback(searchProfileService, compensation)
      throw error
    }

    return new StepResponse(
      {
        created: compensation.createdIds.length,
        profile_keys: plan.profileKeys,
        unchanged: plan.unchangedProfileIds.length,
        updated: compensation.updates.length,
      },
      compensation
    )
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }
    await rollback(
      container.resolve<SearchProfileService>(SEARCH_PROFILE_MODULE),
      compensation
    )
  }
)
