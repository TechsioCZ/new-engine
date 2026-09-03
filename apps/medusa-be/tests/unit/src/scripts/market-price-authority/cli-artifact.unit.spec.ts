import {
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildMarketPricePlanArtifact,
  serializeMarketPricePlanArtifact,
  writeMarketPricePlanArtifact,
} from "../../../../../src/scripts/market-price-authority/artifact"
import {
  parseMarketPriceAuthorityCliOptions,
  runMarketPriceAuthorityCli,
} from "../../../../../src/scripts/market-price-authority/cli"
import {
  buildMarketPricePlan,
  hashMarketPricePlan,
} from "../../../../../src/scripts/market-price-authority/planner"
import {
  AUTHORITY_SHA,
  authority,
  authorityBytes,
  rawSourceBytes,
  snapshot,
} from "./fixtures"

const temporaryDirectories: string[] = []

const temporaryDirectory = async () => {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), "market-price-authority-"))
  )
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

describe("market price dry-run CLI and private artifact", () => {
  it("parses one exact dry-run-only four-market command", () => {
    const root = "/private/tmp/market-price"
    const args = [
      "--authority",
      `${root}/authority.json`,
      "--expected-authority-sha256",
      AUTHORITY_SHA,
      "--cz-source",
      `${root}/cz.json`,
      "--hu-source",
      `${root}/hu.json`,
      "--ro-source",
      `${root}/ro.json`,
      "--sk-source",
      `${root}/sk.json`,
      "--plan-output",
      `${root}/plan.json`,
    ]
    expect(parseMarketPriceAuthorityCliOptions(args)).toMatchObject({
      authorityPath: `${root}/authority.json`,
      planOutputPath: `${root}/plan.json`,
    })
    expect(parseMarketPriceAuthorityCliOptions([...args, "--dry-run"])).toEqual(
      parseMarketPriceAuthorityCliOptions(args)
    )
    expect(() =>
      parseMarketPriceAuthorityCliOptions([...args, "--apply"])
    ).toThrow("unknown market price authority option --apply")
    expect(() =>
      parseMarketPriceAuthorityCliOptions([
        ...args,
        "--authority",
        `${root}/other.json`,
      ])
    ).toThrow("duplicate option --authority")
    expect(() =>
      parseMarketPriceAuthorityCliOptions([
        ...args.slice(0, 1),
        "relative.json",
        ...args.slice(2),
      ])
    ).toThrow("canonical absolute path")
  })

  it("writes canonical 0600 bytes and refuses to clobber", async () => {
    const directory = await temporaryDirectory()
    const output = join(directory, "plan.json")
    const plan = buildMarketPricePlan(authority(), AUTHORITY_SHA, snapshot())
    const planSha256 = hashMarketPricePlan(plan)
    const artifact = await writeMarketPricePlanArtifact(
      output,
      plan,
      planSha256
    )
    expect(await readFile(output, "utf8")).toBe(
      serializeMarketPricePlanArtifact(artifact)
    )
    expect((await stat(output)).mode % 0o1000).toBe(0o600)
    await expect(
      writeMarketPricePlanArtifact(output, plan, planSha256)
    ).rejects.toThrow("already exists")
    expect(buildMarketPricePlanArtifact(plan, planSha256)).toEqual(artifact)
  })

  it("allows exactly one concurrent no-clobber publisher", async () => {
    const directory = await temporaryDirectory()
    const output = join(directory, "race.json")
    const plan = buildMarketPricePlan(authority(), AUTHORITY_SHA, snapshot())
    const planSha256 = hashMarketPricePlan(plan)
    const outcomes = await Promise.allSettled([
      writeMarketPricePlanArtifact(output, plan, planSha256),
      writeMarketPricePlanArtifact(output, plan, planSha256),
    ])
    expect(
      outcomes.filter(({ status }) => status === "fulfilled")
    ).toHaveLength(1)
    expect(outcomes.filter(({ status }) => status === "rejected")).toHaveLength(
      1
    )
  })

  it("orchestrates only reviewed reads, pure planning, and one artifact write", async () => {
    const directory = await temporaryDirectory()
    const paths = {
      authority: join(directory, "authority.json"),
      cz: join(directory, "cz.json"),
      hu: join(directory, "hu.json"),
      plan: join(directory, "plan.json"),
      ro: join(directory, "ro.json"),
      sk: join(directory, "sk.json"),
    }
    await Promise.all([
      writeFile(paths.authority, authorityBytes(), { mode: 0o600 }),
      ...(["cz", "hu", "ro", "sk"] as const).map((market) =>
        writeFile(paths[market], rawSourceBytes[market], { mode: 0o600 })
      ),
    ])
    const plan = buildMarketPricePlan(authority(), AUTHORITY_SHA, snapshot())
    const planSha256 = hashMarketPricePlan(plan)
    const loadAuthority = vi.fn().mockResolvedValue({
      authority: authority(),
      authoritySha256: AUTHORITY_SHA,
    })
    const verifyRawSources = vi.fn().mockResolvedValue({})
    const collectSnapshot = vi.fn().mockResolvedValue(snapshot())
    const buildPlan = vi.fn().mockReturnValue(plan)
    const hashPlan = vi.fn().mockReturnValue(planSha256)
    const writePlanArtifact = vi
      .fn()
      .mockResolvedValue(buildMarketPricePlanArtifact(plan, planSha256))

    await runMarketPriceAuthorityCli(
      {
        authorityPath: paths.authority,
        expectedAuthoritySha256: AUTHORITY_SHA,
        planOutputPath: paths.plan,
        rawSourcePaths: {
          cz: paths.cz,
          hu: paths.hu,
          ro: paths.ro,
          sk: paths.sk,
        },
      },
      {
        buildPlan,
        collectSnapshot,
        hashPlan,
        loadAuthority,
        verifyRawSources,
        writePlanArtifact,
      }
    )

    expect(loadAuthority).toHaveBeenCalledOnce()
    expect(verifyRawSources).toHaveBeenCalledOnce()
    expect(collectSnapshot).toHaveBeenCalledOnce()
    expect(buildPlan).toHaveBeenCalledOnce()
    expect(writePlanArtifact).toHaveBeenCalledExactlyOnceWith(
      paths.plan,
      plan,
      planSha256
    )
  })
})
