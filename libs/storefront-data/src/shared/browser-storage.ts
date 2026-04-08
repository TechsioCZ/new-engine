// Compatibility entrypoint.
// Prefer:
// - ./local-storage for safe localStorage helpers
// - ./storage-value-store for observable storage-backed persistence
export {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "./local-storage"
export {
  createLocalStorageValueStore,
  type StorageValueStore,
} from "./storage-value-store"
