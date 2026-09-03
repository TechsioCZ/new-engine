import { describe, expect, it, vi } from "vitest"
import { hashPopulationManifest } from "../../src/lib/url-registry/population/manifest"
import {
  parseFourMarketConvergenceArguments,
  runFourMarketConvergenceCli,
} from "./collect-convergence"
import { collectFourMarketConvergenceArtifacts } from "./convergence-collector"
import {
  fourMarketManifestFixture,
  fourMarketRowsFixture,
  segmentRegistryRefsFixture,
} from "./convergence-test-fixture"

const argv = [
  "--artifact-root",
  "/evidence",
  "--environment-id",
  "zane-production",
  "--expected-population-manifest-sha256",
  hashPopulationManifest(fourMarketManifestFixture()),
  "--generated-at",
  "2026-08-21T08:05:00.000Z",
  "--population-manifest",
  "/reviewed/population.json",
  "--release-id",
  "release-2026-08-21",
  "--segment-registry-dir",
  "/evidence/segment-registry-g1",
  "--statement-timeout-ms",
  "4321",
] as const

describe("four-market convergence CLI", () => {
  it("requires exact explicit identity, input, output, and timeout arguments", () => {
    expect(parseFourMarketConvergenceArguments(argv)).toEqual({
      artifactRoot: "/evidence",
      environmentId: "zane-production",
      expectedPopulationManifestSha256: hashPopulationManifest(
        fourMarketManifestFixture()
      ),
      generatedAt: "2026-08-21T08:05:00.000Z",
      populationManifestPath: "/reviewed/population.json",
      releaseId: "release-2026-08-21",
      segmentRegistryDirectory: "/evidence/segment-registry-g1",
      statementTimeoutMs: 4321,
    })
    expect(() => parseFourMarketConvergenceArguments(argv.slice(2))).toThrow()
    expect(() =>
      parseFourMarketConvergenceArguments([...argv, "--unknown", "value"])
    ).toThrow()
    expect(() =>
      parseFourMarketConvergenceArguments([
        ...argv,
        "--release-id",
        "duplicate",
      ])
    ).toThrow()
  })

  it("uses only the two named DB authorities and closes before writing", async () => {
    const events: string[] = []
    const configs: unknown[] = []
    const output: string[] = []
    const refs = {
      staticTaxonomy: {
        path: "urlr/four-market-static-taxonomy-convergence.json",
        sha256: "a".repeat(64),
      },
      urlRegistry: {
        path: "operations/four-market-urlr-convergence.json",
        sha256: "b".repeat(64),
      },
    }
    const artifacts = collectFourMarketConvergenceArtifacts({
      identity: {
        environmentId: "zane-production",
        generatedAt: "2026-08-21T08:05:00.000Z",
        releaseId: "release-2026-08-21",
      },
      manifest: fourMarketManifestFixture(),
      rows: fourMarketRowsFixture(),
      segmentRegistryByMarket: segmentRegistryRefsFixture(),
    })

    await expect(
      runFourMarketConvergenceCli(
        argv,
        {
          DATABASE_URL: "postgres://medusa.internal/commerce",
          URL_REGISTRY_DATABASE_URL: "postgres://urlr.internal/registry",
        },
        {
          collect: (input) => {
            events.push("collect")
            expect(input.identity.environmentId).toBe("zane-production")
            return artifacts
          },
          createReader: (config) => {
            configs.push(config)
            return {
              close: () => {
                events.push("close")
                return Promise.resolve()
              },
              read: () => {
                events.push("read")
                return Promise.resolve(fourMarketRowsFixture())
              },
            }
          },
          loadText: () =>
            Promise.resolve(JSON.stringify(fourMarketManifestFixture())),
          loadSegmentRegistryRefs: (root) => {
            expect(root).toBe("/evidence")
            return Promise.resolve(segmentRegistryRefsFixture())
          },
          write: (root, value) => {
            events.push("write")
            expect(root).toBe("/evidence")
            expect(value).toBe(artifacts)
            return Promise.resolve(refs)
          },
          writeStdout: (value) => output.push(value),
        }
      )
    ).resolves.toEqual(refs)

    expect(configs).toEqual([
      {
        medusaDatabaseUrl: "postgres://medusa.internal/commerce",
        statementTimeoutMs: 4321,
        urlRegistryDatabaseUrl: "postgres://urlr.internal/registry",
      },
    ])
    expect(events).toEqual(["read", "collect", "close", "write"])
    expect(output).toEqual([`${JSON.stringify(refs)}\n`])
  })

  it("fails before reader creation when either explicit DB env is absent", async () => {
    const createReader = vi.fn()
    await expect(
      runFourMarketConvergenceCli(
        argv,
        { DATABASE_URL: "postgres://medusa/db" },
        {
          createReader,
          loadSegmentRegistryRefs: () =>
            Promise.resolve(segmentRegistryRefsFixture()),
          loadText: () =>
            Promise.resolve(JSON.stringify(fourMarketManifestFixture())),
        }
      )
    ).rejects.toThrow("URL_REGISTRY_DATABASE_URL")
    expect(createReader).not.toHaveBeenCalled()
  })

  it("rejects a manifest that does not match the reviewed semantic hash", async () => {
    const createReader = vi.fn()
    const mismatched = argv.map((value, index) =>
      argv[index - 1] === "--expected-population-manifest-sha256"
        ? `sha256:${"0".repeat(64)}`
        : value
    )
    await expect(
      runFourMarketConvergenceCli(
        mismatched,
        {
          DATABASE_URL: "postgres://medusa/db",
          URL_REGISTRY_DATABASE_URL: "postgres://urlr/registry",
        },
        {
          createReader,
          loadText: () =>
            Promise.resolve(JSON.stringify(fourMarketManifestFixture())),
        }
      )
    ).rejects.toThrow("PopulationManifest SHA-256 mismatch")
    expect(createReader).not.toHaveBeenCalled()
  })
})
