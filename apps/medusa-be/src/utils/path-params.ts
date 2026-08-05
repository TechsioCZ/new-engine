import { MedusaError } from "@medusajs/framework/utils"

export const requirePathParam = (
  value: string | undefined,
  label: string,
): string => {
  if (value === undefined || value.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} path parameter is required`,
    )
  }

  return value
}
