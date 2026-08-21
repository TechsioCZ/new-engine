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

  it("copies the workspace package before the CI image installs dependencies", () => {
    const workspaceRoot = resolve(__dirname, "../../../..")
    const dockerfile = readFileSync(
      resolve(workspaceRoot, "docker/development/medusa-be/Dockerfile"),
      "utf8"
    )
    const ciDevStage = dockerfile.slice(
      dockerfile.indexOf("FROM base AS ci-dev"),
      dockerfile.indexOf("FROM base AS build")
    )
    const dependencyCopy = ciDevStage.indexOf(
      "COPY libs/storefront-i18n ./libs/storefront-i18n"
    )
    const frozenInstall = ciDevStage.indexOf(
      "pnpm install --store-dir=/pnpm/store --prefer-offline --frozen-lockfile --filter=medusa-be..."
    )

    expect(dependencyCopy).toBeGreaterThan(-1)
    expect(frozenInstall).toBeGreaterThan(dependencyCopy)
  })
})
