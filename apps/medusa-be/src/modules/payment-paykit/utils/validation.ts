import { MedusaError } from "@medusajs/framework/utils"

export const requirePaykitOptions = <TOptions extends object>(
  label: string,
  options: TOptions,
  keys: readonly (keyof TOptions & string)[],
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
