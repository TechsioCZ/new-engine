import {
  POPULATION_VISIBLE_TEXT,
  PopulationManifestError,
} from "./manifest-contracts"

export const populationRecord = (
  value: unknown,
  label: string
): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new PopulationManifestError(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

export const assertPopulationExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new PopulationManifestError(`${label} has invalid fields`)
  }
}

export const populationText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !POPULATION_VISIBLE_TEXT.test(value)) {
    throw new PopulationManifestError(`${label} is invalid`)
  }
  return value
}

export const populationOneOf = <Value extends string>(
  value: unknown,
  values: readonly Value[],
  label: string
): Value => {
  if (typeof value !== "string" || !values.includes(value as Value)) {
    throw new PopulationManifestError(`${label} is invalid`)
  }
  return value as Value
}

export const canonicalizePopulationValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizePopulationValue)
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  const input = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(input)
      .sort()
      .map((key) => [key, canonicalizePopulationValue(input[key])])
  )
}
