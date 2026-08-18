import { createUrlRegistryRuntime } from "./factory.server"

// Imported only from getServerSideProps; never import this from page render UI.

let runtimePromise: ReturnType<typeof createUrlRegistryRuntime> | undefined

export const getUrlRegistryRuntime = () => {
  runtimePromise ??= createUrlRegistryRuntime()
  return runtimePromise
}
