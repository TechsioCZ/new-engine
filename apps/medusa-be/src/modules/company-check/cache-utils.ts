import { createHash } from "node:crypto"
import type {
  AresEconomicSubjectSearchRequest,
  AresStandardizedAddressSearchRequest,
} from "./types"
import { isRecord } from "../../utils/type-guards"

const WHITESPACE_REGEX = /\s+/g

export const CACHE_KEYS = {
  aresIco: (ico: string) => `company-check:ares:ico:${ico}`,
  aresName: (nameHash: string) => `company-check:ares:name:${nameHash}`,
  aresAddress: (payloadHash: string) => `company-check:ares:address:${payloadHash}`,
  aresAddressStandardization: (payloadHash: string) =>
    `company-check:ares:address-standardization:${payloadHash}`,
  aresSearch: (payloadHash: string) => `company-check:ares:search:${payloadHash}`,
  vies: (countryCode: string, vatNumber: string) =>
    `company-check:vies:${countryCode}:${vatNumber}`,
  mojeDane: (dicDigits: string) => `company-check:mojedane:${dicDigits}`,
} as const

export const LOCK_KEYS = {
  aresIco: (ico: string) => `company-check:lock:ares:ico:${ico}`,
  aresName: (nameHash: string) => `company-check:lock:ares:name:${nameHash}`,
  aresAddress: (payloadHash: string) =>
    `company-check:lock:ares:address:${payloadHash}`,
  aresAddressStandardization: (payloadHash: string) =>
    `company-check:lock:ares:address-standardization:${payloadHash}`,
  aresSearch: (payloadHash: string) => `company-check:lock:ares:search:${payloadHash}`,
  vies: (countryCode: string, vatNumber: string) =>
    `company-check:lock:vies:${countryCode}:${vatNumber}`,
  mojeDane: (dicDigits: string) => `company-check:lock:mojedane:${dicDigits}`,
} as const

export const CACHE_TTL = {
  ARES: 24 * 60 * 60, // 24 hours
  ARES_NEGATIVE: 30 * 60, // 30 minutes
  VIES: 6 * 60 * 60, // 6 hours
  VIES_NEGATIVE: 30 * 60, // 30 minutes
  MOJE_DANE: 24 * 60 * 60, // 24 hours
  MOJE_DANE_NEGATIVE: 30 * 60, // 30 minutes
} as const

export type AresSearchCacheDescriptor = {
  cacheKey: string
  lockKey: string
}

function removeWhitespace(value: string): string {
  return value.replace(WHITESPACE_REGEX, "")
}

function normalizeForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableJson(item))
  }

  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeForStableJson(value[key])
    }
    return normalized
  }

  return value
}

export function hashCacheValue(value: unknown): string {
  const serialized = JSON.stringify(normalizeForStableJson(value))
  return createHash("sha256").update(serialized).digest("hex").slice(0, 24)
}

export function resolveAresEconomicSubjectsSearchCache(
  payload: AresEconomicSubjectSearchRequest
): AresSearchCacheDescriptor {
  const keys = Object.keys(payload)

  if (
    keys.length === 1 &&
    keys[0] === "obchodniJmeno" &&
    typeof payload.obchodniJmeno === "string"
  ) {
    const normalizedCompanyName = removeWhitespace(payload.obchodniJmeno.trim())
    if (normalizedCompanyName) {
      const normalizedCompanyNameHash = hashCacheValue(normalizedCompanyName)
      return {
        cacheKey: CACHE_KEYS.aresName(normalizedCompanyNameHash),
        lockKey: LOCK_KEYS.aresName(normalizedCompanyNameHash),
      }
    }
  }

  if (keys.length === 1 && keys[0] === "sidlo" && isRecord(payload.sidlo)) {
    const sidloHash = hashCacheValue(payload.sidlo)
    return {
      cacheKey: CACHE_KEYS.aresAddress(sidloHash),
      lockKey: LOCK_KEYS.aresAddress(sidloHash),
    }
  }

  const payloadHash = hashCacheValue(payload)
  return {
    cacheKey: CACHE_KEYS.aresSearch(payloadHash),
    lockKey: LOCK_KEYS.aresSearch(payloadHash),
  }
}

export function resolveAresStandardizedAddressSearchCache(
  payload: AresStandardizedAddressSearchRequest
): AresSearchCacheDescriptor {
  const payloadHash = hashCacheValue(payload)

  return {
    cacheKey: CACHE_KEYS.aresAddressStandardization(payloadHash),
    lockKey: LOCK_KEYS.aresAddressStandardization(payloadHash),
  }
}
