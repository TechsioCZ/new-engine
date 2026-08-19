const hasForbiddenOpaqueCharacter = (value: string) =>
  value.includes("/") ||
  value.includes("\\") ||
  [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0
    return code <= 31 || code === 127
  })

export const exactOpaqueSegment = (
  value: string | string[] | undefined,
  maximumLength = 2048
): string | null =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= maximumLength &&
  !hasForbiddenOpaqueCharacter(value)
    ? value
    : null

export const exactOptionalQueryValue = (
  value: string | string[] | undefined,
  maximumLength = 2048
): string | null | undefined => {
  if (value === undefined) {
    return
  }
  return exactOpaqueSegment(value, maximumLength)
}
