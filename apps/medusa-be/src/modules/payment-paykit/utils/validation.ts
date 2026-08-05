import { MedusaError } from "@medusajs/framework/utils"

export const requirePaykitOptions = (
  label: string,
  options: Record<string, unknown>,
  keys: string[],
): void => {
  const missing = keys.filter((key) => {
    const value = options[key]

    return value === undefined || value === null || value === ""
  })

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} missing required option(s): ${missing.join(", ")}`,
    )
  }
}
