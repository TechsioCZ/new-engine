// biome-ignore-all lint/performance/noBarrelFile: This is the registry package public API.
export type {
  CreateUrlRecordInput,
  UrlLookupResult,
  UrlRegistry,
  UrlRegistryListQuery,
  UrlRegistryListResult,
} from "./contracts"
export { isUrlRegistryError, UrlRegistryError } from "./errors"
export {
  getUrlRegistry,
  resetUrlRegistryForTests,
  setUrlRegistryForTests,
} from "./factory"
export { InMemoryUrlRegistry } from "./memory"
export { PostgresUrlRegistry } from "./postgres"
