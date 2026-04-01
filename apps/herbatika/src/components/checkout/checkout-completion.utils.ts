const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const resolveOrderId = (result: unknown) => {
  if (!isObject(result)) {
    return null;
  }

  if (
    result.type === "order" &&
    isObject(result.order) &&
    typeof result.order.id === "string"
  ) {
    return result.order.id;
  }

  if (isObject(result.order) && typeof result.order.id === "string") {
    return result.order.id;
  }

  return null;
};

export const resolveCompleteCartFailure = (result: unknown) => {
  if (!isObject(result)) {
    return null;
  }

  if (
    result.type === "cart" &&
    isObject(result.error) &&
    typeof result.error.message === "string"
  ) {
    return result.error.message;
  }

  return null;
};
