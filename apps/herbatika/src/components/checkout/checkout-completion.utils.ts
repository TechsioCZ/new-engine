import { getRecordValue, isRecord } from "@techsio/std/object"

export const resolveOrderId = (result: unknown) => {
  if (!isRecord(result)) {
    return null
  }

  const order = getRecordValue(result, "order")
  if (!isRecord(order)) {
    return null
  }
  const orderId = getRecordValue(order, "id")
  return typeof orderId === "string" ? orderId : null
}

export const resolveCompleteCartFailure = (result: unknown) => {
  if (!isRecord(result) || getRecordValue(result, "type") !== "cart") {
    return null
  }

  const error = getRecordValue(result, "error")
  if (!isRecord(error)) {
    return null
  }
  const message = getRecordValue(error, "message")
  return typeof message === "string" ? message : null
}
