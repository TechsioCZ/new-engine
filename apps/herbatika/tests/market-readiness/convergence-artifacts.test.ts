import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  FOUR_MARKET_STATIC_TAXONOMY_ARTIFACT_PATH,
  FOUR_MARKET_URLR_ARTIFACT_PATH,
  writeFourMarketConvergenceArtifacts,
} from "./convergence-artifacts"
import { collectFourMarketConvergenceArtifacts } from "./convergence-collector"
import {
  fourMarketManifestFixture,
  fourMarketRowsFixture,
  segmentRegistryRefsFixture,
} from "./convergence-test-fixture"
import { serializeFourMarketStaticTaxonomyConvergence } from "./static-taxonomy-convergence"
import { serializeFourMarketUrlrConvergence } from "./urlr-convergence"

const roots: string[] = []
const RAW_SHA256 = /^[a-f0-9]{64}$/
const UNSAFE_PATH_ERROR = /canonical|unsafe/

const canonicalRoot = async () => {
  const created = await mkdtemp(join(tmpdir(), "four-market-readiness-"))
  const root = await realpath(created)
  roots.push(root)
  return root
}

const artifactsFixture = () =>
  collectFourMarketConvergenceArtifacts({
    identity: {
      environmentId: "zane-production",
      generatedAt: "2026-08-21T08:05:00.000Z",
      releaseId: "release-2026-08-21",
    },
    manifest: fourMarketManifestFixture(),
    rows: fourMarketRowsFixture(),
    segmentRegistryByMarket: segmentRegistryRefsFixture(),
  })

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true }))
  )
})

describe("four-market convergence artifact writer", () => {
  it("writes exact canonical bytes at fixed paths with private modes", async () => {
    const root = await canonicalRoot()
    const artifacts = artifactsFixture()
    const refs = await writeFourMarketConvergenceArtifacts(root, artifacts)

    expect(refs.urlRegistry.path).toBe(FOUR_MARKET_URLR_ARTIFACT_PATH)
    expect(refs.staticTaxonomy.path).toBe(
      FOUR_MARKET_STATIC_TAXONOMY_ARTIFACT_PATH
    )
    const urlrPath = join(root, refs.urlRegistry.path)
    const staticPath = join(root, refs.staticTaxonomy.path)
    expect(await readFile(urlrPath, "utf8")).toBe(
      serializeFourMarketUrlrConvergence(artifacts.urlRegistry)
    )
    expect(await readFile(staticPath, "utf8")).toBe(
      serializeFourMarketStaticTaxonomyConvergence(artifacts.staticTaxonomy)
    )
    expect((await stat(urlrPath)).mode % 0o1000).toBe(0o600)
    expect((await stat(staticPath)).mode % 0o1000).toBe(0o600)
    expect(refs.urlRegistry.sha256).toMatch(RAW_SHA256)
    expect(refs.staticTaxonomy.sha256).toMatch(RAW_SHA256)
  })

  it("never clobbers either existing artifact", async () => {
    const root = await canonicalRoot()
    const artifacts = artifactsFixture()
    await writeFourMarketConvergenceArtifacts(root, artifacts)

    await expect(
      writeFourMarketConvergenceArtifacts(root, artifacts)
    ).rejects.toMatchObject({ code: "EEXIST" })
  })

  it("removes only its first output when the second path already exists", async () => {
    const root = await canonicalRoot()
    const staticPath = join(root, FOUR_MARKET_STATIC_TAXONOMY_ARTIFACT_PATH)
    await mkdir(join(root, "urlr"), { mode: 0o700 })
    await writeFile(staticPath, "preserve-me", { flag: "wx", mode: 0o600 })

    await expect(
      writeFourMarketConvergenceArtifacts(root, artifactsFixture())
    ).rejects.toMatchObject({ code: "EEXIST" })
    await expect(
      readFile(join(root, FOUR_MARKET_URLR_ARTIFACT_PATH))
    ).rejects.toMatchObject({ code: "ENOENT" })
    expect(await readFile(staticPath, "utf8")).toBe("preserve-me")
  })

  it("rejects symlinked artifact roots and output directories", async () => {
    const root = await canonicalRoot()
    const target = await canonicalRoot()
    const rootAlias = join(target, "root-alias")
    await symlink(root, rootAlias, "dir")
    await expect(
      writeFourMarketConvergenceArtifacts(rootAlias, artifactsFixture())
    ).rejects.toThrow(UNSAFE_PATH_ERROR)

    await symlink(target, join(root, "operations"), "dir")
    await expect(
      writeFourMarketConvergenceArtifacts(root, artifactsFixture())
    ).rejects.toThrow("artifact directory is unsafe")
  })
})
