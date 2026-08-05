interface DateFormatOptions {
  day?: "numeric" | "2-digit"
  month?: "numeric" | "2-digit" | "long" | "short"
  year?: "numeric" | "2-digit"
  weekday?: "long" | "short" | "narrow"
  hour?: "numeric" | "2-digit"
  minute?: "numeric" | "2-digit"
  second?: "numeric" | "2-digit"
}

function formatDate(date: Date, options?: DateFormatOptions): string {
  return new Intl.DateTimeFormat("cs-CZ", options).format(date)
}

export function formatDateString(
  dateString: string,
  options?: DateFormatOptions
): string {
  try {
    return formatDate(new Date(dateString), options)
  } catch {
    return "Neznámé datum"
  }
}

export const formatDateShort = (date: Date) =>
  formatDate(date, { day: "2-digit", month: "2-digit", year: "numeric" })

export const formatDay = (date: Date) => formatDate(date, { day: "numeric" })

export function addDays(days: number, from = new Date()): Date {
  const result = new Date(from)
  result.setDate(result.getDate() + days)
  return result
}
