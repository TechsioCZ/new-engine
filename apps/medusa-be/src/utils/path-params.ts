import { MedusaError } from "@medusajs/framework/utils"

export function requirePathParam(
  value: string | undefined,
  label: string,
): string {
  if (!value) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} path parameter is required`,
    )
  }

  return value
}
