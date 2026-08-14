import { isPlainRecord } from "../guards"
import { PRODUCT_SALE_ADAPTER_NAMES } from "./types"

const productSaleAdapterNameValues = new Set<string>(PRODUCT_SALE_ADAPTER_NAMES)

const collectValues = (value: unknown, result: unknown[]): void => {
  if (value === undefined || value === null) {
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectValues(item, result)
    }
    return
  }

  if (isPlainRecord(value)) {
    for (const key of Object.keys(value).sort()) {
      collectValues(value[key], result)
    }
    return
  }

  result.push(value)
}

const unwrapListText = (value: string): string => {
  const trimmed = value.trim()

  return trimmed.startsWith("[") && trimmed.endsWith("]")
    ? trimmed.slice(1, -1)
    : trimmed
}

const splitSelectionText = (value: string): string[] =>
  unwrapListText(value)
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)

type SelectionState = {
  names: unknown[]
  selectsAll: boolean
}

const addSelectionToken = (token: unknown, state: SelectionState): void => {
  if (typeof token === "boolean") {
    state.selectsAll ||= token
    return
  }

  if (typeof token !== "string") {
    state.names.push(token)
    return
  }

  const normalizedToken = token.toLowerCase()
  if (normalizedToken === "true") {
    state.selectsAll = true
    return
  }

  if (normalizedToken !== "false") {
    state.names.push(normalizedToken)
  }
}

const addSelectionValue = (value: unknown, state: SelectionState): void => {
  if (typeof value !== "string") {
    addSelectionToken(value, state)
    return
  }

  for (const token of splitSelectionText(value)) {
    addSelectionToken(token, state)
  }
}

const areKnownAdapterNames = (names: unknown[]): boolean =>
  names.every(
    (name) => typeof name === "string" && productSaleAdapterNameValues.has(name)
  )

export const normalizeProductSaleAdapterSelectionInput = (
  value: unknown
): unknown => {
  const values: unknown[] = []
  collectValues(value, values)

  if (values.length === 0) {
    return
  }

  const state: SelectionState = {
    names: [],
    selectsAll: false,
  }

  for (const item of values) {
    addSelectionValue(item, state)
  }

  const names = Array.from(new Set(state.names))

  if (state.selectsAll) {
    return areKnownAdapterNames(names) ? true : names
  }

  return names.length > 0 ? names : undefined
}
