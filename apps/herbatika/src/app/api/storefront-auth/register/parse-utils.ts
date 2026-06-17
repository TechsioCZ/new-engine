export const asStringOrUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const asRecordOrUndefined = (value: unknown) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return
  }

  return value as Record<string, unknown>
}
