const DIACRITICS_REGEX = /\p{Diacritic}/gu

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim()
}
