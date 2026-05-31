export const requirePaykitOptions = (
  label: string,
  options: Record<string, unknown>,
  keys: string[]
): void => {
  const missing = keys.filter((key) => {
    const value = options[key]

    return value === undefined || value === null || value === ""
  })

  if (missing.length) {
    throw new Error(
      `${label} missing required option(s): ${missing.join(", ")}`
    )
  }
}
