export type NormalizedMeasurementSourceUnit = {
  dimension: string
  factor: number
  symbol: string
}

const sourceUnits: Record<string, NormalizedMeasurementSourceUnit> = {}

function registerSourceUnit(
  symbol: string,
  dimension: string,
  factor: number,
  aliases: string[] = []
) {
  const unit = { dimension, factor, symbol }
  for (const alias of [symbol, ...aliases]) {
    sourceUnits[alias] = unit
  }
}

registerSourceUnit("pcs", "piece", 1, [
  "pc",
  "piece",
  "pieces",
  "ks",
  "kus",
  "db",
  "darab",
  "buc",
  "buc.",
  "bucata",
  "bucati",
  "bucată",
  "bucăți",
])
registerSourceUnit("mg", "mass", 0.001)
registerSourceUnit("g", "mass", 1, ["gram", "grams"])
registerSourceUnit("kg", "mass", 1000, ["kilogram", "kilograms"])
registerSourceUnit("ml", "volume", 1)
registerSourceUnit("cl", "volume", 10)
registerSourceUnit("dl", "volume", 100)
registerSourceUnit("l", "volume", 1000, ["liter", "litre"])
registerSourceUnit("mm", "length", 1)
registerSourceUnit("cm", "length", 10)
registerSourceUnit("m", "length", 1000)

export function resolveMeasurementSourceUnit(
  value?: string
): NormalizedMeasurementSourceUnit | undefined {
  const normalized = value?.trim().toLocaleLowerCase("en-US")
  if (!normalized) {
    return
  }

  return (
    sourceUnits[normalized] ?? {
      dimension: `custom:${normalized}`,
      factor: 1,
      symbol: normalized,
    }
  )
}

export const isPieceMeasurementSourceUnit = (value: string) =>
  resolveMeasurementSourceUnit(value)?.symbol === "pcs"

export const normalizeMeasurementQuantity = (value: number) =>
  Number(value.toPrecision(12))
