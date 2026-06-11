const reportDetachedPromiseError = (error: unknown) => {
  queueMicrotask(() => {
    throw error
  })
}

const isPromiseLike = (
  operation: unknown
): operation is PromiseLike<unknown> => {
  if (!(operation && typeof operation === "object")) {
    return false
  }

  return typeof (operation as { then?: unknown }).then === "function"
}

export const runDetachedPromise = (
  operation: unknown,
  onError: (error: unknown) => void = reportDetachedPromiseError
): void => {
  if (!isPromiseLike(operation)) {
    return
  }

  operation.then(undefined, onError)
}
