const REVIEW_POINT_LIMIT = 2
const REVIEW_WHITESPACE = /\s+/g

export function resolveReviewInitial(author: string): string {
  const trimmed = author.trim()

  return trimmed.charAt(0).toUpperCase() || "A"
}

const normalizeReviewText = (value: string) =>
  value.trim().replace(REVIEW_WHITESPACE, " ").toLowerCase()

export const resolveVisibleReviewPoints = (
  points: readonly string[] | undefined
) =>
  points
    ?.map((point) => point.trim())
    .filter(Boolean)
    .slice(0, REVIEW_POINT_LIMIT) ?? []

export const resolveVisibleReviewMessage = (
  message: string | undefined,
  pointGroups: readonly (readonly string[])[]
) => {
  if (!message?.trim()) {
    return
  }

  const normalizedMessage = normalizeReviewText(message)
  const duplicatesPoints = pointGroups
    .filter((points) => points.length > 0)
    .map((points) => normalizeReviewText(points.join(" ")))
    .some((pointGroup) => pointGroup === normalizedMessage)

  return duplicatesPoints ? undefined : message
}
