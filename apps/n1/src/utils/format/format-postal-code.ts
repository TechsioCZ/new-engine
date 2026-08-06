export const formatPostalCode = (value: string): string => {
  // remove all except numbers
  const cleaned = value.replaceAll(/\D/gu, "")

  const limited = cleaned.slice(0, 5)

  if (limited.length > 3) {
    return `${limited.slice(0, 3)} ${limited.slice(3)}`
  }

  return limited
}

export const cleanPostalCode = (value: string): string =>
  value.replaceAll(/\s/gu, "")
