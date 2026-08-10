interface RunMutationWithCleanupInput {
  cleanup: () => void
  onError: (error: unknown) => void
  operation: () => Promise<void>
}

export const runMutationWithCleanup = async ({
  cleanup,
  onError,
  operation,
}: RunMutationWithCleanupInput) => {
  try {
    await operation()
  } catch (error) {
    onError(error)
  } finally {
    cleanup()
  }
}
