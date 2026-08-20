export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }
  const { startUrlRegistryInvalidationDispatcher } = await import(
    "./lib/url-registry/runtime/invalidation-dispatcher-worker.server"
  )
  await startUrlRegistryInvalidationDispatcher()
}
