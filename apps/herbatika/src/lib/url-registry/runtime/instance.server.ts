import { createUrlRegistryRuntime } from "./factory.server"

// Server entry points (GSSP and Route Handlers) share one lazy runtime.
// Never import this module from client or page render components.

let runtimePromise: ReturnType<typeof createUrlRegistryRuntime> | undefined

export const getUrlRegistryRuntime = () => {
  if (runtimePromise) {
    return runtimePromise
  }

  const initialization = createUrlRegistryRuntime()
  runtimePromise = initialization
  initialization.catch(() => {
    if (runtimePromise === initialization) {
      runtimePromise = undefined
    }
  })
  return initialization
}
