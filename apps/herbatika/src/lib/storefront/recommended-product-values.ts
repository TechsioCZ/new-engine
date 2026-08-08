export const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`
  }

  return null
}

export const asPositiveInteger = (value: unknown): number | null => {
  let parsed = Number.NaN
  if (typeof value === "number" && Number.isFinite(value)) {
    parsed = value
  } else if (typeof value === "string" && value.trim().length > 0) {
    parsed = Number(value.trim())
  }

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}
