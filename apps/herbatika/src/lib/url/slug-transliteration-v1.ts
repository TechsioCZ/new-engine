const COMBINING_MARK_PATTERN = /\p{M}+/gu
const LATIN_CHARACTER_PATTERN = /\p{Script=Latin}/u

export const applyTransliterationTable = (
  value: string,
  table: Readonly<Record<string, string>>
): string =>
  Array.from(value, (character) => table[character] ?? character).join("")

export const normalizeDecomposedLatin = (
  value: string,
  fallbackTable: Readonly<Record<string, string>>
): Readonly<{ normalized: string; unmappedCharacter?: string }> => {
  const normalized = applyTransliterationTable(value, fallbackTable)
    .normalize("NFKD")
    .replace(COMBINING_MARK_PATTERN, "")
  const unmappedCharacter = Array.from(normalized).find(
    (character) =>
      (character.codePointAt(0) ?? 0) > 127 &&
      LATIN_CHARACTER_PATTERN.test(character)
  )

  return {
    normalized,
    ...(unmappedCharacter === undefined ? {} : { unmappedCharacter }),
  }
}
