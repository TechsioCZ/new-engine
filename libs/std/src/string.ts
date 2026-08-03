const WHITESPACE_REGEX = /\s+/g
const NON_WORD_REGEX = /[^\w-]+/g
const MULTIPLE_DASHES_REGEX = /--+/g
const LEADING_DASHES_REGEX = /^-/
const TRAILING_DASHES_REGEX = /-$/

export const hasTrimmedString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const normalizeTrimmedString = (value: unknown): string | undefined =>
  hasTrimmedString(value) ? value.trim() : undefined

export const normalizePresentTrimmedString = (
  value: unknown
): string | undefined => (typeof value === "string" ? value.trim() : undefined)

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(WHITESPACE_REGEX, "-")
    .replace(NON_WORD_REGEX, "")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(LEADING_DASHES_REGEX, "")
    .replace(TRAILING_DASHES_REGEX, "")
