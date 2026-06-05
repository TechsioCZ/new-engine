import { MedusaError } from "@medusajs/framework/utils"
import {
  PRODUCT_LIST_ACCESS_TYPES,
  PRODUCT_LIST_TYPES,
  type ProductListAccessType,
  type ProductListType,
} from "./constants"

const isProductListAccessType = (
  value: unknown
): value is ProductListAccessType =>
  typeof value === "string" &&
  PRODUCT_LIST_ACCESS_TYPES.includes(value as ProductListAccessType)

export const normalizeProductListAccessType = (value: unknown) => {
  if (value === undefined) {
    return "private"
  }

  if (isProductListAccessType(value)) {
    return value
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported product list access type: ${String(value)}`
  )
}

export const normalizeProductListType = (value: unknown): ProductListType => {
  if (typeof value !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported product list type: ${String(value)}`
    )
  }

  if (PRODUCT_LIST_TYPES.includes(value as ProductListType)) {
    return value as ProductListType
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported product list type: ${value}`
  )
}

export const normalizePositiveInteger = (
  field: string,
  value: unknown,
  defaultValue = 1
) => {
  if (value === undefined) {
    return defaultValue
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `${field} must be a positive integer`
  )
}

export const normalizeNonNegativeInteger = (
  field: string,
  value: unknown,
  defaultValue = 0
) => {
  if (value === undefined) {
    return defaultValue
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `${field} must be a non-negative integer`
  )
}
