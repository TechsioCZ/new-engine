const WHITESPACE_REGEX = /\s+/gu
const NON_WORD_REGEX = /[^\w-]+/gu
const MULTIPLE_DASHES_REGEX = /--+/gu
const LEADING_DASHES_REGEX = /^-/u
const TRAILING_DASHES_REGEX = /-$/u

export const hasTrimmedString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const normalizeTrimmedString = (value: unknown): string | undefined =>
  hasTrimmedString(value) ? value.trim() : undefined

export const normalizePresentTrimmedString = (
  value: unknown,
): string | undefined => (typeof value === "string" ? value.trim() : undefined)

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(WHITESPACE_REGEX, "-")
    .replace(NON_WORD_REGEX, "")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(LEADING_DASHES_REGEX, "")
    .replace(TRAILING_DASHES_REGEX, "")
