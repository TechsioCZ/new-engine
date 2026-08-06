const reportDetachedPromiseError = (error: unknown) => {
  queueMicrotask(() => {
    throw error
  })
}

export const runDetachedPromise = (
  operation: unknown,
  onError: (error: unknown) => void = reportDetachedPromiseError,
): void => {
  const observeOperation = async () => {
    try {
      await operation
    } catch (error) {
      onError(error)
    }
  }

  void observeOperation()
}
