type PlayerTimeFormatters = {
  hour: Intl.NumberFormat
  minute: Intl.NumberFormat
  second: Intl.NumberFormat
  list: Intl.ListFormat
}

const formatters = new Map<string, PlayerTimeFormatters>()

function getFormatters(locale: string): PlayerTimeFormatters {
  let cached = formatters.get(locale)
  if (!cached) {
    const numberFormat = (unit: string) =>
      new Intl.NumberFormat(locale, {
        style: "unit",
        unit,
        unitDisplay: "long",
      })
    cached = {
      hour: numberFormat("hour"),
      minute: numberFormat("minute"),
      second: numberFormat("second"),
      list: new Intl.ListFormat(locale, { style: "long", type: "unit" }),
    }
    formatters.set(locale, cached)
  }
  return cached
}

/** Spoken elapsed time; callers handle live streams before formatting a duration. */
export function formatPlayerTime(seconds: number, locale = "en"): string {
  const total = Number.isFinite(seconds) ? Math.floor(Math.max(0, seconds)) : 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainingSeconds = total % 60
  const format = getFormatters(locale)
  const parts: string[] = []
  if (hours > 0) {
    parts.push(format.hour.format(hours))
  }
  if (minutes > 0) {
    parts.push(format.minute.format(minutes))
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(format.second.format(remainingSeconds))
  }
  return format.list.format(parts)
}
