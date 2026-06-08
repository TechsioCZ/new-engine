import { MedusaError } from "@medusajs/framework/utils"

export const getRouteParam = (
  params: Record<string, string | undefined>,
  key: string
) => {
  const value = params[key]

  if (!value) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Missing route parameter: ${key}`
    )
  }

  return value
}
