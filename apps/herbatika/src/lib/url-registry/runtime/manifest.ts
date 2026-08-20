export type UrlRegistryMigrationManifestEntry = Readonly<{
  checksum: string
  name: string
  version: number
}>

export type UrlRegistryMigrationManifest =
  readonly UrlRegistryMigrationManifestEntry[]

export const URL_REGISTRY_MIGRATION_MANIFEST_VERSION = 5 as const

export const URL_REGISTRY_MIGRATION_MANIFEST_V1 = Object.freeze([
  Object.freeze({
    checksum:
      "sha256:a2982999a57c35e72cb305a0c5c6f066f0af97c99356220c448c61d0094e0d39",
    name: "0001_create_url_registry.sql",
    version: 1,
  }),
]) satisfies UrlRegistryMigrationManifest

export const URL_REGISTRY_MIGRATION_MANIFEST_V2 = Object.freeze([
  ...URL_REGISTRY_MIGRATION_MANIFEST_V1,
  Object.freeze({
    checksum:
      "sha256:1de756b1ba2c69218c748867a86bc1fde5ecea0453ff82cdba5493fe9ea5010f",
    name: "0002_create_source_event_tracking.sql",
    version: 2,
  }),
]) satisfies UrlRegistryMigrationManifest

export const URL_REGISTRY_MIGRATION_MANIFEST_V3 = Object.freeze([
  ...URL_REGISTRY_MIGRATION_MANIFEST_V2,
  Object.freeze({
    checksum:
      "sha256:203206facb95c7145b4ab6908faa027e54e06a1b1ce92c5c51bc3d28ead3277d",
    name: "0003_generalize_source_event_receipts.sql",
    version: 3,
  }),
]) satisfies UrlRegistryMigrationManifest

export const URL_REGISTRY_MIGRATION_MANIFEST_V4 = Object.freeze([
  ...URL_REGISTRY_MIGRATION_MANIFEST_V3,
  Object.freeze({
    checksum:
      "sha256:d8d646d9a93d23ada0a92d44bc887a231963ef1531690ece0d335f030e572e24",
    name: "0004_add_invalidation_delivery_diagnostics.sql",
    version: 4,
  }),
]) satisfies UrlRegistryMigrationManifest

export const URL_REGISTRY_MIGRATION_MANIFEST_V5 = Object.freeze([
  ...URL_REGISTRY_MIGRATION_MANIFEST_V4,
  Object.freeze({
    checksum:
      "sha256:2007ae50b9cecb18b5b539a8cd99da1a3eb8b7a83afa33058e7fa2ad52fa460a",
    name: "0005_allow_catalog_unpublish_retirement.sql",
    version: 5,
  }),
]) satisfies UrlRegistryMigrationManifest
