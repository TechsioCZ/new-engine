export const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replaceAll(/[^\d+]/gu, "")

  if (cleaned.startsWith("+420")) {
    const numbers = cleaned.slice(4)
    const groups = numbers.match(/.{1,3}/gu) ?? []
    return `+420 ${groups.join(" ")}`.trim()
  }

  const groups = cleaned.match(/.{1,3}/gu) ?? []
  return groups.join(" ")
}

export const cleanPhoneNumber = (value: string): string =>
  value.replaceAll(/\s/gu, "")
