const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const resolveOrderId = (result: unknown) => {
  if (!isObject(result)) {
    return null
  }

  const { order } = result
  if (!isObject(order) || typeof order["id"] !== "string") {
    return null
  }

  return order["id"]
}

export const resolveCompleteCartFailure = (result: unknown) => {
  if (!isObject(result) || result["type"] !== "cart") {
    return null
  }

  const { error } = result
  if (!isObject(error) || typeof error["message"] !== "string") {
    return null
  }

  return error["message"]
}
