export function formatPhoneNumber(value: string): string {
  const cleaned = value.replaceAll(/[^\d+]/g, "")

  if (cleaned.startsWith("+420")) {
    const numbers = cleaned.slice(4)
    const groups = numbers.match(/.{1,3}/g) || []
    return `+420 ${groups.join(" ")}`.trim()
  }

  const groups = cleaned.match(/.{1,3}/g) || []
  return groups.join(" ")
}

export function cleanPhoneNumber(value: string): string {
  return value.replaceAll(/\s/g, "")
}
