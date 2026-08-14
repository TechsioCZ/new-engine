import { isPlainRecord } from "../guards"

export const getProductRecordId = (product: unknown): string | undefined => {
  if (!isPlainRecord(product)) {
    return
  }

  return typeof product.id === "string" && product.id.trim()
    ? product.id.trim()
    : undefined
}
