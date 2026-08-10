type DateFormatOptions = Pick<
  Intl.DateTimeFormatOptions,
  "day" | "month" | "year" | "weekday" | "hour" | "minute" | "second"
>

const formatDate = (date: Date, options?: DateFormatOptions): string =>
  new Intl.DateTimeFormat("cs-CZ", options).format(date)

export const formatDateString = (
  dateString: string,
  options?: DateFormatOptions,
): string => {
  try {
    return formatDate(new Date(dateString), options)
  } catch {
    return "Neznámé datum"
  }
}

export const formatDateShort = (date: Date) =>
  formatDate(date, { day: "2-digit", month: "2-digit", year: "numeric" })

export const formatDay = (date: Date) => formatDate(date, { day: "numeric" })

export const addDays = (days: number, from = new Date()): Date => {
  const result = new Date(from)
  result.setDate(result.getDate() + days)
  return result
}
