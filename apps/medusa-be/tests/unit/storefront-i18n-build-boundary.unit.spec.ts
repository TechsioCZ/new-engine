import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

type PackageManifest = Readonly<{
  dependencies?: Readonly<Record<string, string>>
  scripts?: Readonly<Record<string, string>>
}>

const readPackageManifest = (path: string): PackageManifest =>
  JSON.parse(readFileSync(path, "utf8")) as PackageManifest

describe("storefront i18n backend build boundary", () => {
  it("builds the workspace package before a direct backend production build", () => {
    const backendPackage = readPackageManifest(
      resolve(__dirname, "../../package.json")
    )

    expect(backendPackage.dependencies?.["@techsio/storefront-i18n"]).toBe(
      "workspace:*"
    )
    expect(backendPackage.scripts?.prebuild).toBe(
      "pnpm --filter @techsio/storefront-i18n build"
    )
  })
})
