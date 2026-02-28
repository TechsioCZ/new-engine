import { createParser, parseAsString, parseAsStringLiteral } from "nuqs"
import { ACCOUNT_TABS } from "../account-tabs"

function normalizePositiveInt(value: number): number {
  if (!(Number.isFinite(value) && value > 0)) {
    return 1
  }
  return Math.floor(value)
}

function parseStrictPositiveInt(value: string): number | null {
  const trimmedValue = value.trim()
  if (!/^\d+$/.test(trimmedValue)) {
    return null
  }

  const parsed = Number.parseInt(trimmedValue, 10)
  if (!(Number.isFinite(parsed) && parsed > 0)) {
    return null
  }

  return Math.floor(parsed)
}

export const parseAsPositivePage = createParser<number>({
  parse: parseStrictPositiveInt,
  serialize: (value) => String(normalizePositiveInt(value)),
  eq: (a, b) => a === b,
})

export const parseAsPositivePageWithDefault = parseAsPositivePage.withDefault(1)
export const parseAsSearchQuery = parseAsString
export const parseAsCategoryId = parseAsString
export const parseAsAccountTab = parseAsStringLiteral(ACCOUNT_TABS)
