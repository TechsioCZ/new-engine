import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildSegmentRegistryPublicationArtifacts } from "../../scripts/segment-registry-publication/build"
import { parsedPublicationPlanFixture } from "../../src/lib/url/segment-registry-publication.fixture"
import { loadSegmentRegistryRefsByMarket } from "./segment-registry-refs"

const roots: string[] = []

const canonicalRoot = async () => {
  const created = await mkdtemp(join(tmpdir(), "segment-registry-refs-"))
  const root = await realpath(created)
  roots.push(root)
  return root
}

const writePublishedArtifacts = async (root: string) => {
  const directory = join(root, "segment-registry-g1")
  await mkdir(directory, { mode: 0o700 })
  const builds = buildSegmentRegistryPublicationArtifacts(
    parsedPublicationPlanFixture(),
    "/private/market-static-content-plan.json"
  )
  await Promise.all(
    builds.map(({ canonicalJson, market }) =>
      writeFile(join(directory, `${market}.json`), canonicalJson, {
        flag: "wx",
        mode: 0o600,
      })
    )
  )
  return builds
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true }))
  )
})

describe("segment registry readiness references", () => {
  it("emits only refs that resolve to published files under the artifact root", async () => {
    const root = await canonicalRoot()
    const builds = await writePublishedArtifacts(root)

    const refs = await loadSegmentRegistryRefsByMarket(root)

    for (const { market, sha256 } of builds) {
      expect(refs[market]).toEqual({
        ref: `segment-registry-g1/${market}.json`,
        sha256,
      })
      await expect(
        readFile(join(root, refs[market].ref), "utf8")
      ).resolves.toEqual(expect.stringContaining(`"market":"${market}"`))
    }
  })

  it("cannot emit refs from an arbitrary sibling source directory", async () => {
    const artifactRoot = await canonicalRoot()
    const sourceRoot = await canonicalRoot()
    await writePublishedArtifacts(sourceRoot)

    await expect(
      loadSegmentRegistryRefsByMarket(artifactRoot)
    ).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("rejects symlinked and hard-linked publication files", async () => {
    const symlinkRoot = await canonicalRoot()
    await writePublishedArtifacts(symlinkRoot)
    const symlinkDirectory = join(symlinkRoot, "segment-registry-g1")
    const symlinkTarget = join(symlinkRoot, "outside-ro.json")
    const roPath = join(symlinkDirectory, "ro.json")
    await writeFile(symlinkTarget, await readFile(roPath), { mode: 0o600 })
    await unlink(roPath)
    await symlink(symlinkTarget, roPath)
    await expect(loadSegmentRegistryRefsByMarket(symlinkRoot)).rejects.toThrow()

    const hardlinkRoot = await canonicalRoot()
    await writePublishedArtifacts(hardlinkRoot)
    const hardlinkPath = join(hardlinkRoot, "segment-registry-g1", "ro.json")
    await link(hardlinkPath, join(hardlinkRoot, "ro-copy.json"))
    await expect(loadSegmentRegistryRefsByMarket(hardlinkRoot)).rejects.toThrow(
      "segment registry artifact is unsafe for ro"
    )
  })
})
