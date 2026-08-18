export type UrlRegistryMigrationManifestEntry = Readonly<{
  checksum: string
  name: string
  version: number
}>

export type UrlRegistryMigrationManifest =
  readonly UrlRegistryMigrationManifestEntry[]

export const URL_REGISTRY_MIGRATION_MANIFEST_VERSION = 1 as const

export const URL_REGISTRY_MIGRATION_MANIFEST_V1 = Object.freeze([
  Object.freeze({
    checksum:
      "sha256:a2982999a57c35e72cb305a0c5c6f066f0af97c99356220c448c61d0094e0d39",
    name: "0001_create_url_registry.sql",
    version: 1,
  }),
]) satisfies UrlRegistryMigrationManifest
