import { MedusaError } from "@medusajs/framework/utils"

export function toTrimmedString(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

export function toTrimmedOrNull(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function requireTrimmedValue(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${field} is required`
    )
  }

  return trimmed
}
