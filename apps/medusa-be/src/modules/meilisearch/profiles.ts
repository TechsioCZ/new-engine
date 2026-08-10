import type { MedusaContainer } from "@medusajs/framework/types"
import { getRecordValue, isRecord } from "@techsio/std/object"

import type SearchProfileModuleService from "../search-profile/service"
import { MAX_SEARCH_PROFILES } from "../search-profile/types"
import type { SearchProfileDTO } from "../search-profile/types"
import { MEILISEARCH_MAX_TOTAL_HITS } from "./settings"

export const SEARCH_INDEX_TYPES = [
  "product",
  "category",
  "brand",
  "content",
] as const

export type SearchIndexType = (typeof SEARCH_INDEX_TYPES)[number]

export interface SearchProfileLimits {
  autocomplete: Record<SearchIndexType, number>
  fullSearch: number
  page: number
  popular: number
}

export interface SearchProfile {
  availability: "all" | "in-stock"
  domain: string
  id?: string
  isDefaultFallback?: boolean
  matchesAllLocales?: boolean
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

interface RawSearchProfile {
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

export interface SearchProfileSelection {
  locale?: string
  requestedKey?: string
  salesChannelIds?: string[]
}

export type SearchProfileErrorCode =
  | "SEARCH_PROFILE_CONFIGURATION_INVALID"
  | "SEARCH_PROFILE_RESOLUTION_FAILED"

export class SearchProfileError extends Error {
  readonly code: SearchProfileErrorCode

  constructor(code: SearchProfileErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "SearchProfileError"
  }
}

export const isSearchProfileConfigurationError = (
  value: unknown,
): value is SearchProfileError =>
  value instanceof SearchProfileError &&
  value.code === "SEARCH_PROFILE_CONFIGURATION_INVALID"

export const isSearchProfileResolutionError = (
  value: unknown,
): value is SearchProfileError =>
  value instanceof SearchProfileError &&
  value.code === "SEARCH_PROFILE_RESOLUTION_FAILED"

const configurationError = (message: string): SearchProfileError =>
  new SearchProfileError("SEARCH_PROFILE_CONFIGURATION_INVALID", message)

const resolutionError = (message: string): SearchProfileError =>
  new SearchProfileError("SEARCH_PROFILE_RESOLUTION_FAILED", message)

const SEARCH_PROFILE_MODULE = "search_profile"
const SEARCH_PROFILES_ENV_NAME = "MEILISEARCH_SEARCH_PROFILES"
const DEFAULT_AUTOCOMPLETE_LIMITS: Record<SearchIndexType, number> = {
  brand: 3,
  category: 3,
  content: 3,
  product: 6,
}
const DEFAULT_PROFILE: SearchProfile = {
  availability: "all",
  domain: "default",
  indexes: {
    brand: "brand_default_default_default",
    category: "category_default_default_default",
    content: "content_default_default_default",
    product: "product_default_default_default",
  },
  isDefaultFallback: true,
  key: "default",
  limits: {
    autocomplete: DEFAULT_AUTOCOMPLETE_LIMITS,
    fullSearch: 500,
    page: 100,
    popular: 12,
  },
  locale: "default",
  matchesAllLocales: true,
  minimumRankingScore: 0,
  salesChannelIds: [],
  separateVariantResults: false,
  shop: "default",
  strict: false,
}

const normalizeSegment = (value: string, field: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/[^a-z0-9_-]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

  if (normalized.length === 0) {
    throw configurationError(
      `Meilisearch search profile ${field} must contain an index-safe value`,
    )
  }

  return normalized
}

const fieldPath = (profileIndex: number, field: string): string =>
  `${SEARCH_PROFILES_ENV_NAME}[${profileIndex}].${field}`

const readRequiredString = (
  value: unknown,
  field: string,
  profileIndex: number,
): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw configurationError(
      `${fieldPath(profileIndex, field)} must be a non-empty string`,
    )
  }

  return value.trim()
}

const readBoolean = (
  value: unknown,
  fallback: boolean,
  field: string,
  profileIndex: number,
): boolean => {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== "boolean") {
    throw configurationError(
      `${fieldPath(profileIndex, field)} must be a boolean`,
    )
  }

  return value
}

const readLimitedInteger = (options: {
  fallback: number
  field: string
  maximum: number
  profileIndex: number
  value: unknown
}): number => {
  if (options.value === undefined) {
    return options.fallback
  }

  if (
    typeof options.value !== "number" ||
    !Number.isInteger(options.value) ||
    options.value < 1 ||
    options.value > options.maximum
  ) {
    throw configurationError(
      `${fieldPath(options.profileIndex, options.field)} must be an integer between 1 and ${options.maximum}`,
    )
  }

  return options.value
}

const readRankingScore = (
  value: unknown,
  strict: boolean,
  profileIndex: number,
): number => {
  if (value === undefined) {
    return strict ? 0.98 : 0.55
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw configurationError(
      `${fieldPath(profileIndex, "minimumRankingScore")} must be between 0 and 1`,
    )
  }

  return value
}

const readAvailability = (
  value: unknown,
  profileIndex: number,
): SearchProfile["availability"] => {
  if (value === undefined) {
    return "all"
  }

  if (value === "all" || value === "in-stock") {
    return value
  }

  throw configurationError(
    `${fieldPath(profileIndex, "availability")} must be "all" or "in-stock"`,
  )
}

const readStringArray = (
  value: unknown,
  field: string,
  profileIndex: number,
): string[] => {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw configurationError(
      `${fieldPath(profileIndex, field)} must be an array`,
    )
  }

  const entries = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw configurationError(
        `${fieldPath(profileIndex, field)} must contain only non-empty strings`,
      )
    }

    entries.add(entry.trim())
  }

  return [...entries]
}

const createIndexNames = (
  shop: string,
  domain: string,
  locale: string,
): Record<SearchIndexType, string> => ({
  brand: `brand_${shop}_${domain}_${locale}`,
  category: `category_${shop}_${domain}_${locale}`,
  content: `content_${shop}_${domain}_${locale}`,
  product: `product_${shop}_${domain}_${locale}`,
})

const readLimits = (
  value: unknown,
  profileIndex: number,
): SearchProfileLimits => {
  const raw = isRecord(value) ? value : {}
  const autocomplete = getRecordValue(raw, "autocomplete")
  const rawAutocomplete = isRecord(autocomplete) ? autocomplete : {}
  const readAutocomplete = (type: SearchIndexType): number =>
    readLimitedInteger({
      fallback: DEFAULT_AUTOCOMPLETE_LIMITS[type],
      field: `limits.autocomplete.${type}`,
      maximum: 24,
      profileIndex,
      value: getRecordValue(rawAutocomplete, type),
    })

  return {
    autocomplete: {
      brand: readAutocomplete("brand"),
      category: readAutocomplete("category"),
      content: readAutocomplete("content"),
      product: readAutocomplete("product"),
    },
    fullSearch: readLimitedInteger({
      fallback: 500,
      field: "limits.fullSearch",
      maximum: MEILISEARCH_MAX_TOTAL_HITS,
      profileIndex,
      value: getRecordValue(raw, "fullSearch"),
    }),
    page: readLimitedInteger({
      fallback: 100,
      field: "limits.page",
      maximum: 100,
      profileIndex,
      value: getRecordValue(raw, "page"),
    }),
    popular: readLimitedInteger({
      fallback: 12,
      field: "limits.popular",
      maximum: 48,
      profileIndex,
      value: getRecordValue(raw, "popular"),
    }),
  }
}

const parseProfile = (
  raw: RawSearchProfile,
  profileIndex: number,
): SearchProfile => {
  const shop = normalizeSegment(
    readRequiredString(raw.shop, "shop", profileIndex),
    "shop",
  )
  const domain = normalizeSegment(
    readRequiredString(raw.domain, "domain", profileIndex),
    "domain",
  )
  const locale = normalizeSegment(
    readRequiredString(raw.locale, "locale", profileIndex),
    "locale",
  )
  const strict = readBoolean(raw.strict, false, "strict", profileIndex)
  const rawKey =
    typeof raw.key === "string" && raw.key.trim().length > 0
      ? raw.key
      : `${shop}-${domain}-${locale}`
  const key = normalizeSegment(rawKey, "key")

  return {
    availability: readAvailability(raw.availability, profileIndex),
    domain,
    indexes: createIndexNames(shop, domain, locale),
    key,
    limits: readLimits(raw.limits, profileIndex),
    locale,
    minimumRankingScore: readRankingScore(
      raw.minimumRankingScore,
      strict,
      profileIndex,
    ),
    salesChannelIds: readStringArray(
      raw.salesChannelIds,
      "salesChannelIds",
      profileIndex,
    ),
    separateVariantResults: readBoolean(
      raw.separateVariantResults,
      false,
      "separateVariantResults",
      profileIndex,
    ),
    shop,
    strict,
  }
}

const parseProfileEntry = (entry: unknown, index: number): SearchProfile => {
  if (!isRecord(entry)) {
    throw configurationError(
      `${SEARCH_PROFILES_ENV_NAME}[${index}] must be an object`,
    )
  }

  return parseProfile(entry, index)
}

const parseProfilesJson = (value: string): unknown[] => {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch (error) {
    throw configurationError(
      `${SEARCH_PROFILES_ENV_NAME} must be valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw configurationError(
      `${SEARCH_PROFILES_ENV_NAME} must be a non-empty JSON array`,
    )
  }

  if (parsed.length > MAX_SEARCH_PROFILES) {
    throw configurationError(
      `${SEARCH_PROFILES_ENV_NAME} must contain at most ${MAX_SEARCH_PROFILES} profiles`,
    )
  }

  return parsed
}

export const parseSearchProfileConfiguration = (
  entry: unknown,
  index = 0,
): SearchProfile => parseProfileEntry(entry, index)

const assertUniqueProfileValues = (
  profiles: SearchProfile[],
  describe: (profile: SearchProfile) => string,
  label: string,
): void => {
  const seen = new Set<string>()

  for (const profile of profiles) {
    const value = describe(profile)

    if (seen.has(value)) {
      throw configurationError(`Duplicate Meilisearch ${label}: ${value}`)
    }

    seen.add(value)
  }
}

export const validateSearchProfileSet = (profiles: SearchProfile[]): void => {
  if (profiles.length > MAX_SEARCH_PROFILES) {
    throw configurationError(
      `At most ${MAX_SEARCH_PROFILES} Meilisearch search profiles may be configured`,
    )
  }

  assertUniqueProfileValues(profiles, (profile) => profile.key, "profile key")
  assertUniqueProfileValues(
    profiles,
    (profile) => `${profile.shop}:${profile.domain}:${profile.locale}`,
    "shop/domain/locale profile",
  )

  if (
    profiles.length > 1 &&
    profiles.some((profile) => profile.salesChannelIds.length === 0)
  ) {
    throw configurationError(
      "Every Meilisearch search profile must declare salesChannelIds when more than one domain profile is configured",
    )
  }
}

export const readSearchProfiles = (
  env: NodeJS.ProcessEnv = process.env,
): SearchProfile[] => {
  const value = env["MEILISEARCH_SEARCH_PROFILES"]?.trim()

  if (value === undefined || value.length === 0) {
    return [DEFAULT_PROFILE]
  }

  const profiles = parseProfilesJson(value).map(parseProfileEntry)

  validateSearchProfileSet(profiles)

  return profiles
}

const isDefaultProfileIdentity = (profile: SearchProfileDTO): boolean =>
  [profile.key, profile.shop, profile.domain, profile.locale].every(
    (value) => value === "default",
  )

export const persistedSearchProfileToRuntime = (
  profile: SearchProfileDTO,
  profileIndex = 0,
): SearchProfile => ({
  ...parseProfile(
    {
      availability: profile.availability,
      domain: profile.domain,
      key: profile.key,
      limits: {
        autocomplete: {
          brand: profile.autocomplete_brand_limit,
          category: profile.autocomplete_category_limit,
          content: profile.autocomplete_content_limit,
          product: profile.autocomplete_product_limit,
        },
        fullSearch: profile.full_search_limit,
        page: profile.max_results_per_page,
        popular: profile.popular_limit,
      },
      locale: profile.locale,
      minimumRankingScore: profile.minimum_ranking_score ?? undefined,
      salesChannelIds: profile.sales_channel_ids,
      separateVariantResults: profile.separate_variant_results,
      shop: profile.shop,
      strict: profile.strict,
    },
    profileIndex,
  ),
  ...(isDefaultProfileIdentity(profile) ? { matchesAllLocales: true } : {}),
  ...(profile.id.length > 0 ? { id: profile.id } : {}),
})

export const loadSearchProfiles = async (
  container: MedusaContainer,
  options?: { fresh?: boolean },
): Promise<SearchProfile[]> => {
  let service: SearchProfileModuleService

  try {
    service = container.resolve<SearchProfileModuleService>(
      SEARCH_PROFILE_MODULE,
    )
  } catch {
    return []
  }

  if (typeof service.listConfiguredProfiles !== "function") {
    return []
  }

  const persisted =
    options?.fresh === true || typeof service.listRuntimeProfiles !== "function"
      ? await service.listConfiguredProfiles({ enabledOnly: true })
      : await service.listRuntimeProfiles()

  if (persisted.length === 0) {
    return []
  }

  const profiles = persisted.map(persistedSearchProfileToRuntime)

  validateSearchProfileSet(profiles)

  return profiles
}

const normalizeLocale = (value: string): string =>
  value.trim().toLowerCase().replaceAll("_", "-").split("-")[0] ?? ""

const hasSalesChannelAccess = (
  profile: SearchProfile,
  salesChannelIds: Set<string>,
): boolean =>
  profile.isDefaultFallback === true ||
  profile.salesChannelIds.some((id) => salesChannelIds.has(id))

export const resolveSearchProfile = (
  selection: SearchProfileSelection,
  profiles: SearchProfile[] = [],
): SearchProfile => {
  const salesChannelIds = new Set(selection.salesChannelIds)
  const requestedKey = selection.requestedKey?.trim().toLowerCase()

  if (requestedKey !== undefined && requestedKey.length > 0) {
    const profile = profiles.find((entry) => entry.key === requestedKey)

    if (profile === undefined) {
      throw resolutionError(
        `Unknown Meilisearch search profile: ${requestedKey}`,
      )
    }

    if (!hasSalesChannelAccess(profile, salesChannelIds)) {
      throw resolutionError(
        `Search profile ${requestedKey} is not available for this storefront`,
      )
    }

    return profile
  }

  const requestedLocale =
    selection.locale !== undefined && selection.locale.length > 0
      ? normalizeLocale(selection.locale)
      : undefined
  const accessible = profiles.filter((profile) =>
    hasSalesChannelAccess(profile, salesChannelIds),
  )
  const candidates =
    requestedLocale === undefined
      ? accessible
      : accessible.filter(
          (profile) =>
            profile.matchesAllLocales === true ||
            normalizeLocale(profile.locale) === requestedLocale,
        )
  const specificCandidates = candidates.filter(
    (profile) =>
      !(
        profile.key === DEFAULT_PROFILE.key &&
        profile.matchesAllLocales === true
      ),
  )
  const resolvedCandidates =
    specificCandidates.length > 0 ? specificCandidates : candidates
  if (resolvedCandidates.length > 1) {
    throw resolutionError(
      "Multiple Meilisearch profiles match this storefront Sales Channel and language; specify a profile key",
    )
  }

  const [candidate] = resolvedCandidates

  if (candidate !== undefined) {
    return candidate
  }

  throw resolutionError(
    "No Meilisearch profile is assigned to this storefront Sales Channel and language",
  )
}
