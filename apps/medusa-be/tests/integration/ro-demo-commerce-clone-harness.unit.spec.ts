import { spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  type CloneHarnessCommerceRunner,
  type CloneHarnessProcessRunner,
  type CommerceInvocation,
  DISPOSABLE_DATABASE_MARKER_VERSION,
  parseDisposableDatabaseTarget,
  redactProcessDiagnostic,
  runRoDemoCommerceCloneHarness,
  writeRoDemoCommerceCloneHarnessReport,
} from "../../src/scripts/ro-demo-commerce/clone-harness"
import {
  parseRoDemoCliOptions,
  parseRoDemoFingerprintCliOptions,
} from "../../src/scripts/ro-demo-commerce/manifest"

const MARKER = "local-disposable-marker-1234567890abcdef"
const DATABASE_URL =
  "postgresql://postgres:local@127.0.0.1:5432/ro_demo_disposable_test?sslmode=disable"
const PNPM_COMMAND_PATTERN = /^pnpm(?:\.cmd)?$/
const PRICE_AUTHORITY_SHA256 = "a".repeat(64)
const COMMERCE_MANIFEST_SHA256 = "f".repeat(64)
const DATABASE_FINGERPRINT = "b".repeat(64)
const DATABASE_INSTANCE_FINGERPRINT = "c".repeat(64)
const SK_COMMERCE_BASELINE_SHA256 = "d".repeat(64)
const RUNTIME_AUTHORITY = {
  backendBuildHash: "build-local",
  backendDeploymentId: "deployment-local",
  backendReleaseSha: "e".repeat(40),
  backendSlot: "blue" as const,
  environmentId: "herbatika-ro-demo-local",
  expectedCommerceManifestSha256: COMMERCE_MANIFEST_SHA256,
  expectedPriceAuthoritySha256: PRICE_AUTHORITY_SHA256,
}
const HARNESS_SECURITY_OPTIONS = {
  databaseInstanceId: "ro-demo-disposable-postgres",
  runtimeAuthority: RUNTIME_AUTHORITY,
}

const hashFile = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex")

const fakeDeploymentFingerprint = (
  authority: CommerceInvocation["authority"]
) => ({
  commerceManifestSha256: authority.expectedCommerceManifestSha256,
  deploymentIdentity: {
    backendBuildHash: authority.backendBuildHash,
    backendDeploymentId: authority.backendDeploymentId,
    backendReleaseSha: authority.backendReleaseSha,
    backendSlot: authority.backendSlot,
    databaseFingerprint: DATABASE_FINGERPRINT,
    databaseInstanceFingerprint: DATABASE_INSTANCE_FINGERPRINT,
    environmentId: authority.environmentId,
  },
  kind: "ro-demo-commerce-deployment-fingerprint",
  priceAuthoritySha256: authority.expectedPriceAuthoritySha256,
  schemaVersion: 1,
  skCommerceBaseline: { count: 1, sha256: SK_COMMERCE_BASELINE_SHA256 },
})

const writeFakeDeploymentFingerprint = async (
  invocation: CommerceInvocation
) => {
  if (!invocation.fingerprintOutputPath) {
    throw new Error("missing fake fingerprint output")
  }
  await writeFile(
    invocation.fingerprintOutputPath,
    `${JSON.stringify(fakeDeploymentFingerprint(invocation.authority))}\n`
  )
}

const writeFakeApplyArtifacts = async (invocation: CommerceInvocation) => {
  if (!(invocation.receiptOutputPath && invocation.restoreOutputPath)) {
    throw new Error("missing fake apply artifact outputs")
  }
  await Promise.all([
    writeFile(invocation.receiptOutputPath, '{"kind":"receipt"}\n'),
    writeFile(invocation.restoreOutputPath, '{"kind":"restore"}\n'),
  ])
}

describe("RO demo commerce disposable clone safety", () => {
  it("accepts only a loopback, prefixed database with a strong marker", () => {
    expect(parseDisposableDatabaseTarget(DATABASE_URL, MARKER)).toMatchObject({
      databaseName: "ro_demo_disposable_test",
      postgresEnv: {
        PGHOST: "127.0.0.1",
        PGPORT: "5432",
        PGSSLMODE: "disable",
        PGUSER: "postgres",
      },
    })
    expect(
      parseDisposableDatabaseTarget(
        "postgresql://postgres:local@[::1]/ro_demo_disposable_ipv6?sslmode=disable",
        MARKER
      ).postgresEnv.PGHOST
    ).toBe("::1")

    expect(() =>
      parseDisposableDatabaseTarget(
        "postgresql://postgres:secret@db.example.com/ro_demo_disposable_test",
        MARKER
      )
    ).toThrow("host must be loopback")
    expect(() =>
      parseDisposableDatabaseTarget(
        "postgresql://postgres:secret@127.0.0.1/herbatika",
        MARKER
      )
    ).toThrow("name must start")
    expect(() => parseDisposableDatabaseTarget(DATABASE_URL, "short")).toThrow(
      "must be 32-160"
    )
  })

  it("redacts encoded and decoded PostgreSQL credentials", () => {
    const databaseUrl =
      "postgresql://demo%2Buser:hunter%20two@127.0.0.1:5432/ro_demo_disposable_test"
    const diagnostic = redactProcessDiagnostic(
      `failed for ${databaseUrl}; user=demo+user; password=hunter two`,
      { DATABASE_URL: databaseUrl }
    )
    expect(diagnostic).not.toContain(databaseUrl)
    expect(diagnostic).not.toContain("demo+user")
    expect(diagnostic).not.toContain("hunter two")
  })

  it("writes a private report once and refuses to overwrite it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-report-"))
    const reportPath = join(directory, "report.json")
    await writeRoDemoCommerceCloneHarnessReport(reportPath, {
      rollbackVerified: true,
    })
    expect((await stat(reportPath)).mode % 0o1000).toBe(0o600)
    await expect(
      writeRoDemoCommerceCloneHarnessReport(reportPath, {
        rollbackVerified: false,
      })
    ).rejects.toThrow("refusing to overwrite")
    await rm(directory, { force: true, recursive: true })
  })

  it("proves dry-run, hash-bound apply, convergence, and rollback", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-clone-unit-"))
    const state = { value: "baseline" }
    const invocations: string[] = []
    const snapshotPath = join(directory, "before.sql")
    const planPath = join(directory, "plan.json")
    const manifestPath = join(directory, "manifest.json")
    await writeFile(manifestPath, "{}\n")

    const handleDryRunPgDump = async (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      expect(request.args).toEqual(
        expect.arrayContaining(["--clean", "--create", "--if-exists"])
      )
      const outputIndex = request.args.indexOf("--file") + 1
      const outputPath = request.args[outputIndex]
      if (!outputPath) {
        throw new Error("missing fake dump output")
      }
      await writeFile(
        outputPath,
        `\\restrict ${randomBytes(8).toString("hex")}\n${state.value}\n\\unrestrict ${randomBytes(8).toString("hex")}\n`
      )
      return { stderr: "", stdout: "" }
    }
    const handleMarkerPsqlCommand = (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      if (
        request.args.some((argument) => argument.includes("SELECT rolsuper"))
      ) {
        return { stderr: "", stdout: "t\n" }
      }
      return {
        stderr: "",
        stdout: `ro_demo_disposable_test\t${DISPOSABLE_DATABASE_MARKER_VERSION}:${MARKER}\n`,
      }
    }
    const handleRestorePsqlFile = (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      expect(request.args).not.toContain("--single-transaction")
      state.value = "baseline"
      return { stderr: "", stdout: "" }
    }
    const processRunner: CloneHarnessProcessRunner = async (request) => {
      if (request.command === "pg_dump") {
        return await handleDryRunPgDump(request)
      }
      if (request.command === "psql" && request.args.includes("--command")) {
        return handleMarkerPsqlCommand(request)
      }
      if (request.command === "psql" && request.args.includes("--file")) {
        return handleRestorePsqlFile(request)
      }
      throw new Error(`unexpected command ${request.command}`)
    }
    const runCommerce: CloneHarnessCommerceRunner = async (invocation) => {
      invocations.push(invocation.mode)
      if (invocation.mode === "capture-fingerprint") {
        await writeFakeDeploymentFingerprint(invocation)
        return
      }
      if (invocation.mode === "dry-run") {
        await writeFile(
          invocation.planOutputPath,
          state.value === "baseline" ? "apply-plan\n" : "converged-plan\n"
        )
        return
      }
      expect(invocation.confirmPlanHash).toBe(
        await hashFile(invocation.planOutputPath)
      )
      await writeFakeApplyArtifacts(invocation)
      state.value = "applied"
    }

    await expect(
      runRoDemoCommerceCloneHarness(
        {
          ...HARNESS_SECURITY_OPTIONS,
          databaseUrl: DATABASE_URL,
          manifestPath,
          markerToken: MARKER,
          planOutputPath: planPath,
          snapshotOutputPath: snapshotPath,
          workingDirectory: resolve("apps/medusa-be"),
        },
        { processRunner, runCommerce }
      )
    ).resolves.toMatchObject({ rollbackVerified: true })
    expect(invocations).toEqual([
      "capture-fingerprint",
      "dry-run",
      "apply",
      "dry-run",
      "apply",
    ])
    expect(state.value).toBe("baseline")
    await rm(directory, { force: true, recursive: true })
  })

  it("invokes the real commerce entrypoint with only a scrubbed local environment", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-clone-unit-"))
    const state = { value: "baseline" }
    const originalLeak = process.env.RO_DEMO_TEST_LIVE_SECRET
    const originalNodeOptions = process.env.NODE_OPTIONS
    const originalPgHostAddress = process.env.PGHOSTADDR
    const originalPgPassFile = process.env.PGPASSFILE
    const originalPgService = process.env.PGSERVICE
    process.env.RO_DEMO_TEST_LIVE_SECRET = "must-not-reach-child"
    process.env.NODE_OPTIONS = "--require=/tmp/must-not-reach-child.cjs"
    process.env.PGHOSTADDR = "203.0.113.10"
    process.env.PGPASSFILE = "/tmp/live-pgpass-must-not-reach-child"
    process.env.PGSERVICE = "live-service-must-not-reach-child"
    const handleScrubbedFakeDump = async (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      const outputPath = request.args[request.args.indexOf("--file") + 1]
      if (!outputPath) {
        throw new Error("missing fake dump output")
      }
      await writeFile(outputPath, `${state.value}\n`)
      return { stderr: "", stdout: "" }
    }
    const handleScrubbedMarkerCommand = (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      expect(request.env.PGSERVICE).toBeUndefined()
      expect(request.env.PGHOSTADDR).toBeUndefined()
      expect(request.env.PGPASSFILE).toBeUndefined()
      expect(request.env.NODE_OPTIONS).toBeUndefined()
      if (
        request.args.some((argument) => argument.includes("SELECT rolsuper"))
      ) {
        return { stderr: "", stdout: "t\n" }
      }
      return {
        stderr: "",
        stdout: `ro_demo_disposable_test\t${DISPOSABLE_DATABASE_MARKER_VERSION}:${MARKER}\n`,
      }
    }
    const handleScrubbedRestorePsql = () => {
      state.value = "baseline"
      return { stderr: "", stdout: "" }
    }
    const assertScrubbedRuntimeInvocation = (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      expect(request.command).toMatch(PNPM_COMMAND_PATTERN)
      expect(request.args.slice(0, 3)).toEqual(["exec", "medusa", "exec"])
      expect(request.args[3]).toBe(
        resolve(__dirname, "../../src/scripts/ro-demo-commerce/runtime.ts")
      )
      expect(request.env.RO_DEMO_TEST_LIVE_SECRET).toBeUndefined()
      expect(request.env.NODE_OPTIONS).toBeUndefined()
      expect(request.env.PGPASSFILE).toBeUndefined()
      expect(request.env.DATABASE_URL).toBe(DATABASE_URL)
      expect(request.env.LEGACY_DATABASE_URL).toBe(DATABASE_URL)
      expect(request.env.RO_DEMO_DATABASE_INSTANCE_ID).toBe(
        HARNESS_SECURITY_OPTIONS.databaseInstanceId
      )
      expect(request.env.MEILISEARCH_ENABLED).toBe("0")
      expect(request.env.EVENT_BUS_PROVIDER).toBe("local")
    }
    const handleCaptureFingerprintInvocation = async (
      runtimeArgs: readonly string[]
    ) => {
      const capture = parseRoDemoFingerprintCliOptions(runtimeArgs)
      expect(capture).toMatchObject({
        ...RUNTIME_AUTHORITY,
        expectedPriceAuthoritySha256: PRICE_AUTHORITY_SHA256,
      })
      await writeFile(
        capture.fingerprintOutputPath,
        `${JSON.stringify(fakeDeploymentFingerprint(RUNTIME_AUTHORITY))}\n`
      )
    }
    const handleApplyInvocation = async (
      parsed: ReturnType<typeof parseRoDemoCliOptions>
    ) => {
      expect(parsed.confirmPlanHash).toBe(await hashFile(parsed.planOutputPath))
      if (!(parsed.receiptOutputPath && parsed.restoreOutputPath)) {
        throw new Error("real CLI parser omitted apply artifact outputs")
      }
      await Promise.all([
        writeFile(parsed.receiptOutputPath, '{"kind":"receipt"}\n'),
        writeFile(parsed.restoreOutputPath, '{"kind":"restore"}\n'),
      ])
      state.value = "applied"
    }
    const handleScrubbedRuntimeInvocation = async (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      assertScrubbedRuntimeInvocation(request)
      const runtimeArgs = request.args.slice(4)
      if (runtimeArgs.includes("--capture-deployment-fingerprint")) {
        await handleCaptureFingerprintInvocation(runtimeArgs)
        return { stderr: "", stdout: "" }
      }
      const parsed = parseRoDemoCliOptions(runtimeArgs)
      expect(parsed.expectedDeployment).toMatchObject({
        databaseFingerprint: DATABASE_FINGERPRINT,
        databaseInstanceFingerprint: DATABASE_INSTANCE_FINGERPRINT,
      })
      expect(parsed.expectedPriceAuthoritySha256).toBe(PRICE_AUTHORITY_SHA256)
      expect(parsed.expectedSkCommerceBaselineSha256).toBe(
        SK_COMMERCE_BASELINE_SHA256
      )
      if (parsed.apply) {
        await handleApplyInvocation(parsed)
      } else {
        await writeFile(
          parsed.planOutputPath,
          state.value === "baseline" ? "default-plan\n" : "converged-plan\n"
        )
      }
      return { stderr: "", stdout: "" }
    }
    const processRunner: CloneHarnessProcessRunner = async (request) => {
      if (request.command === "pg_dump") {
        return await handleScrubbedFakeDump(request)
      }
      if (request.command === "psql" && request.args.includes("--command")) {
        return handleScrubbedMarkerCommand(request)
      }
      if (request.command === "psql") {
        return handleScrubbedRestorePsql()
      }
      return await handleScrubbedRuntimeInvocation(request)
    }
    try {
      await expect(
        runRoDemoCommerceCloneHarness(
          {
            ...HARNESS_SECURITY_OPTIONS,
            databaseUrl: DATABASE_URL,
            manifestPath: join(directory, "manifest.json"),
            markerToken: MARKER,
            planOutputPath: join(directory, "plan.json"),
            snapshotOutputPath: join(directory, "before.sql"),
            workingDirectory: resolve("apps/medusa-be"),
          },
          { processRunner }
        )
      ).resolves.toMatchObject({ rollbackVerified: true })
    } finally {
      if (originalLeak === undefined) {
        Reflect.deleteProperty(process.env, "RO_DEMO_TEST_LIVE_SECRET")
      } else {
        process.env.RO_DEMO_TEST_LIVE_SECRET = originalLeak
      }
      if (originalNodeOptions === undefined) {
        Reflect.deleteProperty(process.env, "NODE_OPTIONS")
      } else {
        process.env.NODE_OPTIONS = originalNodeOptions
      }
      if (originalPgHostAddress === undefined) {
        Reflect.deleteProperty(process.env, "PGHOSTADDR")
      } else {
        process.env.PGHOSTADDR = originalPgHostAddress
      }
      if (originalPgService === undefined) {
        Reflect.deleteProperty(process.env, "PGSERVICE")
      } else {
        process.env.PGSERVICE = originalPgService
      }
      if (originalPgPassFile === undefined) {
        Reflect.deleteProperty(process.env, "PGPASSFILE")
      } else {
        process.env.PGPASSFILE = originalPgPassFile
      }
      await rm(directory, { force: true, recursive: true })
    }
  })

  it.skipIf(process.platform === "win32")(
    "rejects artifact aliases through a symlinked parent",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "ro-commerce-alias-"))
      const realDirectory = join(directory, "real")
      const aliasDirectory = join(directory, "alias")
      await mkdir(realDirectory)
      await symlink(realDirectory, aliasDirectory, "dir").catch(async () => {
        await rm(directory, { force: true, recursive: true })
        throw new Error("could not create disposable symlink fixture")
      })
      try {
        await expect(
          runRoDemoCommerceCloneHarness(
            {
              ...HARNESS_SECURITY_OPTIONS,
              databaseUrl: DATABASE_URL,
              manifestPath: join(directory, "manifest.json"),
              markerToken: MARKER,
              planOutputPath: join(aliasDirectory, "same.json"),
              snapshotOutputPath: join(realDirectory, "same.json"),
              workingDirectory: resolve("apps/medusa-be"),
            },
            {
              processRunner: async () => {
                throw new Error("database process must not start")
              },
            }
          )
        ).rejects.toThrow("artifact paths must be distinct")
      } finally {
        await rm(directory, { force: true, recursive: true })
      }
    }
  )

  it("refuses a pre-existing derived receipt before any database process", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-no-clobber-"))
    const planOutputPath = join(directory, "plan.json")
    await writeFile(`${planOutputPath}.receipt.json`, "do-not-overwrite\n")
    let processCalls = 0
    try {
      await expect(
        runRoDemoCommerceCloneHarness(
          {
            ...HARNESS_SECURITY_OPTIONS,
            databaseUrl: DATABASE_URL,
            manifestPath: join(directory, "manifest.json"),
            markerToken: MARKER,
            planOutputPath,
            snapshotOutputPath: join(directory, "before.sql"),
            workingDirectory: resolve("apps/medusa-be"),
          },
          {
            processRunner: async () => {
              processCalls += 1
              throw new Error("database process must not start")
            },
          }
        )
      ).rejects.toThrow("artifact output already exists")
      expect(processCalls).toBe(0)
      expect(await readFile(`${planOutputPath}.receipt.json`, "utf8")).toBe(
        "do-not-overwrite\n"
      )
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it("rolls back when runtime rejects EUR/SK drift before writing commerce artifacts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-sk-drift-"))
    const state = { value: "baseline" }
    let dumpCount = 0
    let restores = 0
    const planOutputPath = join(directory, "plan.json")
    const handleDriftDump = async (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      dumpCount += 1
      const outputPath = request.args[request.args.indexOf("--file") + 1]
      if (!outputPath) {
        throw new Error("missing fake dump output")
      }
      await writeFile(outputPath, "baseline\n")
      if (dumpCount === 2) {
        state.value = "eur-sk-mutated-after-fingerprint"
      }
      return { stderr: "", stdout: "" }
    }
    const handleDriftMarkerCommand = (
      request: Parameters<CloneHarnessProcessRunner>[0]
    ) => {
      if (
        request.args.some((argument) => argument.includes("SELECT rolsuper"))
      ) {
        return { stderr: "", stdout: "t\n" }
      }
      return {
        stderr: "",
        stdout: `ro_demo_disposable_test\t${DISPOSABLE_DATABASE_MARKER_VERSION}:${MARKER}\n`,
      }
    }
    const handleDriftRestore = () => {
      restores += 1
      state.value = "baseline"
      return { stderr: "", stdout: "" }
    }
    const processRunner: CloneHarnessProcessRunner = async (request) => {
      if (request.command === "pg_dump") {
        return await handleDriftDump(request)
      }
      if (request.args.includes("--command")) {
        return handleDriftMarkerCommand(request)
      }
      return handleDriftRestore()
    }
    const runCommerce: CloneHarnessCommerceRunner = async (invocation) => {
      if (invocation.mode === "capture-fingerprint") {
        await writeFakeDeploymentFingerprint(invocation)
        return
      }
      expect(invocation.deploymentIdentity?.skCommerceBaselineSha256).toBe(
        SK_COMMERCE_BASELINE_SHA256
      )
      if (state.value !== "baseline") {
        throw new Error("expected SK commerce baseline does not match")
      }
      throw new Error("unexpected commerce execution")
    }
    try {
      await expect(
        runRoDemoCommerceCloneHarness(
          {
            ...HARNESS_SECURITY_OPTIONS,
            databaseUrl: DATABASE_URL,
            manifestPath: join(directory, "manifest.json"),
            markerToken: MARKER,
            planOutputPath,
            snapshotOutputPath: join(directory, "before.sql"),
            workingDirectory: resolve("apps/medusa-be"),
          },
          { processRunner, runCommerce }
        )
      ).rejects.toThrow("expected SK commerce baseline does not match")
      expect(restores).toBe(1)
      await expect(stat(planOutputPath)).rejects.toMatchObject({
        code: "ENOENT",
      })
      await expect(
        stat(`${planOutputPath}.restore.json`)
      ).rejects.toMatchObject({ code: "ENOENT" })
      await expect(
        stat(`${planOutputPath}.receipt.json`)
      ).rejects.toMatchObject({ code: "ENOENT" })
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it("rolls back when the active commerce invocation is aborted", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-abort-"))
    const state = { value: "baseline" }
    const abortController = new AbortController()
    let restores = 0
    const processRunner: CloneHarnessProcessRunner = async (request) => {
      if (request.command === "pg_dump") {
        const outputPath = request.args[request.args.indexOf("--file") + 1]
        if (!outputPath) {
          throw new Error("missing fake dump output")
        }
        await writeFile(outputPath, `${state.value}\n`)
        return { stderr: "", stdout: "" }
      }
      if (request.args.includes("--command")) {
        if (
          request.args.some((argument) => argument.includes("SELECT rolsuper"))
        ) {
          return { stderr: "", stdout: "t\n" }
        }
        return {
          stderr: "",
          stdout: `ro_demo_disposable_test\t${DISPOSABLE_DATABASE_MARKER_VERSION}:${MARKER}\n`,
        }
      }
      restores += 1
      state.value = "baseline"
      return { stderr: "", stdout: "" }
    }
    const runCommerce: CloneHarnessCommerceRunner = async (invocation) => {
      if (invocation.mode === "capture-fingerprint") {
        await writeFakeDeploymentFingerprint(invocation)
        return
      }
      if (invocation.mode === "dry-run") {
        await writeFile(invocation.planOutputPath, "abort-plan\n")
        return
      }
      state.value = "partially-applied"
      abortController.abort(new Error("SIGTERM requested guarded rollback"))
      invocation.signal?.throwIfAborted()
    }
    try {
      await expect(
        runRoDemoCommerceCloneHarness(
          {
            ...HARNESS_SECURITY_OPTIONS,
            databaseUrl: DATABASE_URL,
            manifestPath: join(directory, "manifest.json"),
            markerToken: MARKER,
            planOutputPath: join(directory, "plan.json"),
            signal: abortController.signal,
            snapshotOutputPath: join(directory, "before.sql"),
            workingDirectory: resolve("apps/medusa-be"),
          },
          { processRunner, runCommerce }
        )
      ).rejects.toThrow("SIGTERM requested guarded rollback")
      expect(restores).toBe(1)
      expect(state.value).toBe("baseline")
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it("restores the disposable snapshot when a dishonest dry-run writes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-clone-unit-"))
    const state = { value: "baseline" }
    let restores = 0
    const markerResult = {
      stderr: "",
      stdout: `ro_demo_disposable_test\t${DISPOSABLE_DATABASE_MARKER_VERSION}:${MARKER}\n`,
    }
    const processRunner: CloneHarnessProcessRunner = async (request) => {
      if (request.command === "pg_dump") {
        const outputPath = request.args[request.args.indexOf("--file") + 1]
        if (!outputPath) {
          throw new Error("missing fake dump output")
        }
        await writeFile(outputPath, `${state.value}\n`)
        return { stderr: "", stdout: "" }
      }
      if (request.args.includes("--command")) {
        if (
          request.args.some((argument) => argument.includes("SELECT rolsuper"))
        ) {
          return { stderr: "", stdout: "t\n" }
        }
        return markerResult
      }
      restores += 1
      state.value = "baseline"
      return { stderr: "", stdout: "" }
    }
    const runCommerce: CloneHarnessCommerceRunner = async (invocation) => {
      if (invocation.mode === "capture-fingerprint") {
        await writeFakeDeploymentFingerprint(invocation)
        return
      }
      state.value = "unexpected-write"
      await writeFile(invocation.planOutputPath, "invalid\n")
    }

    await expect(
      runRoDemoCommerceCloneHarness(
        {
          ...HARNESS_SECURITY_OPTIONS,
          databaseUrl: DATABASE_URL,
          manifestPath: join(directory, "manifest.json"),
          markerToken: MARKER,
          planOutputPath: join(directory, "plan.json"),
          snapshotOutputPath: join(directory, "before.sql"),
          workingDirectory: resolve("apps/medusa-be"),
        },
        { processRunner, runCommerce }
      )
    ).rejects.toThrow("dry-run changed")
    expect(restores).toBe(1)
    expect(state.value).toBe("baseline")
    await rm(directory, { force: true, recursive: true })
  })
})

const run = (
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd?: string; env?: NodeJS.ProcessEnv }> = {}
) =>
  new Promise<{ stderr: string; stdout: string }>((resolvePromise, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stderr, stdout })
      } else {
        reject(new Error(`${command} exited ${String(code)}: ${stderr}`))
      }
    })
  })

describe("RO demo commerce clone CLI", () => {
  it("loads through the app-local toolchain from an unrelated CWD", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ro-commerce-cli-"))
    const appDirectory = resolve(__dirname, "../..")
    const cliPath = resolve(
      __dirname,
      "../../src/scripts/ro-demo-commerce/clone-harness-cli.ts"
    )
    const environment = Object.fromEntries(
      [
        "APPDATA",
        "ComSpec",
        "COREPACK_HOME",
        "HOME",
        "LOCALAPPDATA",
        "PATH",
        "PATHEXT",
        "PNPM_HOME",
        "SystemRoot",
        "TEMP",
        "TMP",
        "TMPDIR",
        "USERPROFILE",
      ].flatMap((name) => {
        const value = process.env[name]
        return value === undefined ? [] : [[name, value]]
      })
    )
    try {
      await expect(
        run(
          process.platform === "win32" ? "pnpm.cmd" : "pnpm",
          [
            "--dir",
            appDirectory,
            "exec",
            "ts-node",
            "--swc",
            cliPath,
            "--expected-backend-build-hash",
            RUNTIME_AUTHORITY.backendBuildHash,
            "--expected-backend-deployment-id",
            RUNTIME_AUTHORITY.backendDeploymentId,
            "--expected-backend-release-sha",
            RUNTIME_AUTHORITY.backendReleaseSha,
            "--expected-backend-slot",
            RUNTIME_AUTHORITY.backendSlot,
            "--expected-environment-id",
            RUNTIME_AUTHORITY.environmentId,
            "--expected-commerce-manifest-sha256",
            RUNTIME_AUTHORITY.expectedCommerceManifestSha256,
            "--expected-price-authority-sha256",
            RUNTIME_AUTHORITY.expectedPriceAuthoritySha256,
            "--manifest",
            "manifest.json",
            "--plan-output",
            "plan.json",
            "--report-output",
            "report.json",
            "--snapshot-output",
            "snapshot.sql",
          ],
          { cwd: directory, env: environment }
        )
      ).rejects.toThrow("RO_DEMO_DISPOSABLE_DATABASE_URL is required")
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  }, 30_000)
})

describe.skipIf(process.env.RUN_RO_DEMO_CLONE_DOCKER !== "1")(
  "RO demo commerce clone harness with PostgreSQL",
  () => {
    const containerName = `ro-commerce-clone-${process.pid}-${randomBytes(4).toString("hex")}`
    const password = `local-${randomBytes(12).toString("hex")}`
    const databaseName = "ro_demo_disposable_integration"
    let containerOwned = false
    let directory = ""

    beforeAll(async () => {
      directory = await mkdtemp(join(tmpdir(), "ro-commerce-clone-docker-"))
      await run("docker", [
        "run",
        "--detach",
        "--name",
        containerName,
        "--env",
        `POSTGRES_PASSWORD=${password}`,
        "--env",
        `POSTGRES_DB=${databaseName}`,
        "--volume",
        `${directory}:${directory}`,
        "postgres:18.1-alpine",
      ])
      containerOwned = true
      let databaseReady = false
      for (let attempt = 0; attempt < 240; attempt += 1) {
        const finalServer = await run("docker", [
          "exec",
          containerName,
          "sh",
          "-ec",
          'test "$(cat /proc/1/comm)" = postgres',
        ]).catch(() => {
          // The final postgres process has not replaced the init shell yet.
        })
        if (!finalServer) {
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
          continue
        }
        const ready = await run("docker", [
          "exec",
          containerName,
          "psql",
          "--username",
          "postgres",
          "--dbname",
          databaseName,
          "--tuples-only",
          "--command",
          "SELECT 1;",
        ]).catch(() => {
          // PostgreSQL can take a moment to accept connections.
        })
        if (ready) {
          databaseReady = true
          break
        }
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
      }
      if (!databaseReady) {
        throw new Error("disposable PostgreSQL container did not become ready")
      }
      const sql = [
        `COMMENT ON DATABASE ${databaseName} IS '${DISPOSABLE_DATABASE_MARKER_VERSION}:${MARKER}';`,
        "CREATE TABLE public.commerce_probe (id integer PRIMARY KEY, value text NOT NULL);",
        "INSERT INTO public.commerce_probe VALUES (1, 'baseline');",
      ].join(" ")
      await run("docker", [
        "exec",
        containerName,
        "psql",
        "--username",
        "postgres",
        "--dbname",
        databaseName,
        "--set=ON_ERROR_STOP=1",
        "--command",
        sql,
      ])
    }, 120_000)

    afterAll(async () => {
      if (containerOwned) {
        await run("docker", ["rm", "--force", containerName]).catch(() => {
          // The owned container may already be gone after a runtime failure.
        })
      }
      if (directory) {
        await rm(directory, { force: true, recursive: true })
      }
    })

    it("runs the complete physical snapshot and guarded restore cycle", async () => {
      const processRunner: CloneHarnessProcessRunner = async (request) => {
        const environment = Object.entries(request.env)
          .filter(
            ([key, value]) =>
              key.startsWith("PG") && typeof value === "string" && value
          )
          .flatMap(([key, value]) => ["--env", `${key}=${value}`])
        return run("docker", [
          "exec",
          ...environment,
          containerName,
          request.command,
          ...request.args,
        ])
      }
      const runSql = (sql: string) =>
        run("docker", [
          "exec",
          containerName,
          "psql",
          "--username",
          "postgres",
          "--dbname",
          databaseName,
          "--set=ON_ERROR_STOP=1",
          "--command",
          sql,
        ])
      const runCommerce: CloneHarnessCommerceRunner = async (invocation) => {
        if (invocation.mode === "capture-fingerprint") {
          await writeFakeDeploymentFingerprint(invocation)
          return
        }
        if (invocation.mode === "dry-run") {
          await writeFile(invocation.planOutputPath, "docker-plan\n")
          return
        }
        expect(invocation.confirmPlanHash).toBe(
          await hashFile(invocation.planOutputPath)
        )
        await writeFakeApplyArtifacts(invocation)
        await runSql(
          "INSERT INTO public.commerce_probe (id, value) VALUES (2, 'applied') ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;"
        )
      }
      const report = await runRoDemoCommerceCloneHarness(
        {
          ...HARNESS_SECURITY_OPTIONS,
          databaseUrl: `postgresql://postgres:${password}@127.0.0.1:5432/${databaseName}?sslmode=disable`,
          manifestPath: join(directory, "manifest.json"),
          markerToken: MARKER,
          planOutputPath: join(directory, "plan.json"),
          snapshotOutputPath: join(directory, "before.sql"),
          workingDirectory: resolve("apps/medusa-be"),
        },
        { processRunner, runCommerce }
      )
      expect(report.rollbackVerified).toBe(true)
      const restored = await runSql(
        "SELECT count(*) FROM public.commerce_probe WHERE id = 2;"
      )
      expect(restored.stdout.trim()).toContain("0")
    }, 120_000)
  }
)
