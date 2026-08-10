import { isRecord } from "@techsio/std/object"

import type { PplAccessPoint, PplWidgetError } from "./ppl-widget.types"

const readNullableString = (value: unknown) =>
  typeof value === "string" || value === null ? value : undefined

const parsePplAddress = (value: unknown): PplAccessPoint["address"] => {
  if (!isRecord(value)) {
    return value === null ? null : undefined
  }

  const city = readNullableString(Reflect.get(value, "city"))
  const country = readNullableString(Reflect.get(value, "country"))
  const countryCode = readNullableString(Reflect.get(value, "countryCode"))
  const street = readNullableString(Reflect.get(value, "street"))
  const zipCode = readNullableString(Reflect.get(value, "zipCode"))
  return {
    ...(city === undefined ? {} : { city }),
    ...(country === undefined ? {} : { country }),
    ...(countryCode === undefined ? {} : { countryCode }),
    ...(street === undefined ? {} : { street }),
    ...(zipCode === undefined ? {} : { zipCode }),
  }
}

export const parsePplAccessPoint = (value: unknown): PplAccessPoint | null => {
  if (!isRecord(value)) {
    return null
  }

  const address = parsePplAddress(Reflect.get(value, "address"))
  const code = readNullableString(Reflect.get(value, "code"))
  const name = readNullableString(Reflect.get(value, "name"))
  const type = readNullableString(Reflect.get(value, "type"))
  return {
    ...(address === undefined ? {} : { address }),
    ...(code === undefined ? {} : { code }),
    ...(name === undefined ? {} : { name }),
    ...(type === undefined ? {} : { type }),
  }
}

export const isPplWidgetError = (value: unknown): value is PplWidgetError =>
  isRecord(value) &&
  typeof Reflect.get(value, "code") === "string" &&
  typeof Reflect.get(value, "message") === "string"
