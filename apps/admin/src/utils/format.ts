export function formatCountLabel(count: number, countExact: boolean) {
  return countExact ? String(count) : `${count}+`
}

export function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

export function formatCompactId(value: string): string
export function formatCompactId(value: string | null | undefined): string | null
export function formatCompactId(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if (value.length <= 16) {
    return value
  }

  return `${value.slice(0, 8)}...${value.slice(-5)}`
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatMoney(
  value: number | string | null | undefined,
  currencyCode: string | null | undefined
) {
  if (value === null || value === undefined) {
    return "-"
  }

  const amount = typeof value === "string" ? Number(value) : value

  if (!Number.isFinite(amount)) {
    return "-"
  }

  return new Intl.NumberFormat("cs-CZ", {
    currency: (currencyCode ?? "CZK").toUpperCase(),
    style: "currency",
  }).format(amount)
}

export function readOffset(value: string | null) {
  const offset = Number(value)

  if (!Number.isFinite(offset) || offset <= 0) {
    return 0
  }

  return Math.floor(offset)
}
