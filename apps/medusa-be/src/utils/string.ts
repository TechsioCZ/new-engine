export const normalizeTrimmedText = (
  value: string | undefined,
  fallback: string,
) => {
  const trimmed = value?.trim()

  return trimmed === null || trimmed === undefined || trimmed === ""
    ? fallback
    : trimmed
}
