import { chmod, mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  assertDisposableDatabaseName,
  assertPairwiseDistinct,
  CutoverSafetyError,
  createBackup,
  disposableMarker,
  downloadBackup,
  dropOwnedDisposableDatabase,
  type ProcessRunner,
  parseCliArgs,
  parseDatabaseUrl,
  redact,
  restoreDrill,
  sha256File,
  uploadBackup,
  validateEndpoint,
  validateObjectKey,
  verifyLocalChecksum,
} from "../../../../src/scripts/ro-cutover-backup/index.mts"

const temporaryDirectories: string[] = []
const DUPLICATE_OPTION_PATTERN = /duplicate option/u
const PAIRS_PATTERN = /pairs/u
const DISTINCT_PATTERN = /distinct/u
const SECRET_PATTERN = /hunter2|abc|xyz|exact-value|user:pw/u
const OVERWRITE_PATTERN = /overwrite/u
const SHA256_ERROR_PATTERN = /SHA256/u
const DROP_REFUSAL_PATTERN = /refusing to drop/u
const RESTORE_FAILURE_PATTERN = /mock restore failure/u
const ABORT_FAILURE_PATTERN = /mock signal abort/u
const ALREADY_EXISTS_PATTERN = /already exists/u

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await import("node:fs/promises").then(({ rm }) =>
        rm(directory, { force: true, recursive: true })
      )
    })
  )
})

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "ro-cutover-test-"))
  temporaryDirectories.push(directory)
  return directory
}

function databaseUrl(database = "maintenance"): string {
  return `postgresql://operator:super-secret@db.internal:5432/${database}?sslmode=require`
}

function processMock(
  implementation: (
    command: string,
    args: readonly string[]
  ) =>
    | { stderr?: string; stdout?: string }
    | undefined
    | Promise<{ stderr?: string; stdout?: string } | undefined>
): ProcessRunner & ReturnType<typeof vi.fn> {
  return vi.fn(async (command: string, args: readonly string[]) => {
    const result = (await implementation(command, args)) ?? {}
    return { stderr: result.stderr ?? "", stdout: result.stdout ?? "" }
  })
}

describe("argument and identity guards", () => {
  it("rejects duplicate CLI options and non-paired arguments", () => {
    expect(() =>
      parseCliArgs(["backup", "--output", "a", "--output", "b"])
    ).toThrow(DUPLICATE_OPTION_PATTERN)
    expect(() => parseCliArgs(["backup", "--output"])).toThrow(PAIRS_PATTERN)
  })

  it("requires pairwise-distinct safety identities", () => {
    expect(() =>
      assertPairwiseDistinct({ source: "Medusa", target: "medusa" })
    ).toThrow(DISTINCT_PATTERN)
  })

  it("accepts only the disposable namespace", () => {
    expect(assertDisposableDatabaseName("ro_demo_disposable_20260820_a1")).toBe(
      "ro_demo_disposable_20260820_a1"
    )
    for (const unsafe of [
      "medusa",
      "ro_demo_disposable_",
      "ro_demo_disposable_a;drop",
      "RO_demo_disposable_a",
    ]) {
      expect(() => assertDisposableDatabaseName(unsafe)).toThrow(
        CutoverSafetyError
      )
    }
  })

  it("rejects credential-bearing or presigned endpoints and traversal keys", () => {
    for (const endpoint of [
      "http://objects.example.com",
      "https://key:secret@objects.example.com",
      "https://objects.example.com/path",
      "https://objects.example.com/?X-Amz-Signature=secret",
    ]) {
      expect(() => validateEndpoint(endpoint)).toThrow(CutoverSafetyError)
    }
    for (const key of [
      "/backup.dump",
      "a/../backup.dump",
      "a//backup.dump",
      "a;echo-secret",
    ]) {
      expect(() => validateObjectKey(key)).toThrow(CutoverSafetyError)
    }
  })

  it("parses a database URL into a minimal child environment", () => {
    const parsed = parseDatabaseUrl(databaseUrl())
    expect(parsed.identity).toEqual({
      database: "maintenance",
      host: "db.internal",
      port: "5432",
      user: "operator",
    })
    expect(parsed.childEnv).toMatchObject({
      PGDATABASE: "maintenance",
      PGHOST: "db.internal",
      PGPASSWORD: "super-secret",
      PGSSLMODE: "require",
      PGUSER: "operator",
    })
    expect(parsed.childEnv).not.toHaveProperty("DATABASE_URL")
    expect(Object.keys(parsed.childEnv)).not.toContain("AWS_SECRET_ACCESS_KEY")
  })
})

describe("redaction", () => {
  it("removes URLs, named secrets, and presigned material", () => {
    const output = redact(
      "postgresql://user:pw@db/live password=hunter2 X-Amz-Signature=abc AWS_SESSION_TOKEN=xyz exact-value",
      ["exact-value"]
    )
    expect(output).not.toMatch(SECRET_PATTERN)
    expect(output).toContain("[REDACTED")
  })
})

describe("backup artifacts", () => {
  it("creates a mode-0600 custom dump and checksum without logging credentials", async () => {
    const directory = await temporaryDirectory()
    const output = join(directory, "cutover.dump")
    const runner = processMock(async (command, args) => {
      if (command === "psql") {
        return { stdout: "medusa|operator|180006\n" }
      }
      if (command === "pg_dump") {
        const outputArgument = args.find((argument) =>
          argument.startsWith("--file=")
        )
        if (!outputArgument) {
          throw new Error("missing output")
        }
        await writeFile(
          outputArgument.slice("--file=".length),
          "PGDMP fake custom payload"
        )
        return
      }
      throw new Error(`unexpected command ${command}`)
    })

    const result = await createBackup({
      databaseUrl: databaseUrl("medusa"),
      expectedDatabase: "medusa",
      output,
      runner,
    })

    expect(result.sha256).toBe(await sha256File(output))
    expect(await verifyLocalChecksum(output)).toBe(result.sha256)
    expect((await stat(output)).mode.toString(8).slice(-3)).toBe("600")
    expect((await stat(`${output}.sha256`)).mode.toString(8).slice(-3)).toBe(
      "600"
    )
    expect(runner.mock.calls.flatMap((call) => call[1])).not.toContain(
      databaseUrl("medusa")
    )
  })

  it("fails before pg_dump when either output collides", async () => {
    const directory = await temporaryDirectory()
    const output = join(directory, "cutover.dump")
    await writeFile(output, "do not replace")
    const runner = processMock(() => {
      throw new Error("must not execute")
    })
    await expect(
      createBackup({
        databaseUrl: databaseUrl("medusa"),
        expectedDatabase: "medusa",
        output,
        runner,
      })
    ).rejects.toThrow(OVERWRITE_PATTERN)
    expect(runner).not.toHaveBeenCalled()
    expect(await readFile(output, "utf8")).toBe("do not replace")
  })

  it("rejects checksum mismatches", async () => {
    const directory = await temporaryDirectory()
    const file = join(directory, "cutover.dump")
    await writeFile(file, "dump")
    await chmod(file, 0o600)
    await writeFile(`${file}.sha256`, `${"0".repeat(64)}  cutover.dump\n`)
    await expect(verifyLocalChecksum(file)).rejects.toThrow(
      SHA256_ERROR_PATTERN
    )
  })
})

describe("private object transfer", () => {
  const credentials = {
    AWS_ACCESS_KEY_ID: "access",
    AWS_SECRET_ACCESS_KEY: "secret-value",
  }

  it("uploads only the verified dump and checksum with immutable rclone operations", async () => {
    const directory = await temporaryDirectory()
    const file = join(directory, "cutover.dump")
    await writeFile(file, "payload", { mode: 0o600 })
    const hash = await sha256File(file)
    await writeFile(`${file}.sha256`, `${hash}  cutover.dump\n`, {
      mode: 0o600,
    })
    const runner = processMock(() => ({}))

    await uploadBackup({
      bucket: "private-cutover",
      endpoint: "https://objects.internal.example",
      env: credentials,
      file,
      objectKey: "ro/backup.dump",
      runner,
    })

    expect(runner).toHaveBeenCalledTimes(2)
    for (const call of runner.mock.calls) {
      expect(call[0]).toBe("rclone")
      expect(call[1]).toContain("--immutable")
      expect(call[1].join(" ")).not.toContain("secret-value")
    }
  })

  it("downloads, verifies, and commits without clobbering", async () => {
    const directory = await temporaryDirectory()
    const output = join(directory, "download.dump")
    const payload = "remote payload"
    const hash = await (async () => {
      const source = join(directory, "source")
      await writeFile(source, payload)
      return await sha256File(source)
    })()
    const runner = processMock(async (_command, args) => {
      const destination = args[2]
      if (!destination) {
        throw new Error("missing destination")
      }
      await writeFile(
        destination,
        args[1]?.endsWith(".sha256") ? `${hash}  backup.dump\n` : payload
      )
      return
    })

    await downloadBackup({
      bucket: "private-cutover",
      endpoint: "https://objects.internal.example",
      env: credentials,
      objectKey: "ro/backup.dump",
      output,
      runner,
    })

    expect(await readFile(output, "utf8")).toBe(payload)
    expect(await verifyLocalChecksum(output)).toBe(hash)
    await expect(
      downloadBackup({
        bucket: "private-cutover",
        endpoint: "https://objects.internal.example",
        env: credentials,
        objectKey: "ro/backup.dump",
        output,
        runner,
      })
    ).rejects.toThrow(OVERWRITE_PATTERN)
  })
})

describe("destructive restore guards and cleanup", () => {
  it("refuses a pre-existing disposable target without creating or dropping it", async () => {
    const directory = await temporaryDirectory()
    const dump = join(directory, "cutover.dump")
    await writeFile(dump, "dump")
    const hash = await sha256File(dump)
    await writeFile(`${dump}.sha256`, `${hash}  cutover.dump\n`)
    const runner = processMock((command) => {
      expect(command).toBe("psql")
      return { stdout: "1\n" }
    })

    await expect(
      restoreDrill({
        adminDatabaseUrl: databaseUrl(),
        dump,
        runner,
        sourceDatabase: "medusa",
        targetDatabase: "ro_demo_disposable_collision",
      })
    ).rejects.toThrow(ALREADY_EXISTS_PATTERN)
    expect(runner).toHaveBeenCalledTimes(1)
  })

  it("refuses to drop an unmarked or differently-owned database", async () => {
    for (const ownership of ["unsafe", "other"]) {
      const runner = processMock((command) => {
        expect(command).toBe("psql")
        return { stdout: ownership }
      })
      await expect(
        dropOwnedDisposableDatabase({
          adminDatabaseUrl: databaseUrl(),
          runner,
          targetDatabase: "ro_demo_disposable_guard_test",
        })
      ).rejects.toThrow(DROP_REFUSAL_PATTERN)
      expect(runner).toHaveBeenCalledTimes(1)
    }
  })

  it("drops only after the exact owned marker check", async () => {
    const target = "ro_demo_disposable_guard_test"
    const runner = processMock((command, args) => {
      if (command === "psql") {
        expect(args).toContain(`--set=marker=${disposableMarker(target)}`)
        return { stdout: "owned\n" }
      }
      expect(command).toBe("dropdb")
      expect(args.at(-1)).toBe(target)
      return {}
    })
    await expect(
      dropOwnedDisposableDatabase({
        adminDatabaseUrl: databaseUrl(),
        runner,
        targetDatabase: target,
      })
    ).resolves.toBe("dropped")
    expect(runner).toHaveBeenCalledTimes(2)
  })

  it("cleans an owned disposable database after restore validation succeeds", async () => {
    const directory = await temporaryDirectory()
    const dump = join(directory, "cutover.dump")
    await writeFile(dump, "dump")
    const hash = await sha256File(dump)
    await writeFile(`${dump}.sha256`, `${hash}  cutover.dump\n`)
    const commands: string[] = []
    let psqlCall = 0
    const runner = processMock((command) => {
      commands.push(command)
      if (command === "psql") {
        psqlCall += 1
        return {
          stdout: [
            "0\n",
            "owned\n",
            "ro_demo_disposable_success|42\n",
            "owned\n",
          ][psqlCall - 1],
        }
      }
      return {}
    })

    await expect(
      restoreDrill({
        adminDatabaseUrl: databaseUrl(),
        dump,
        runner,
        sourceDatabase: "medusa",
        targetDatabase: "ro_demo_disposable_success",
      })
    ).resolves.toMatchObject({ relationCount: 42, sha256: hash })
    expect(commands).toEqual([
      "psql",
      "createdb",
      "psql",
      "pg_restore",
      "psql",
      "psql",
      "dropdb",
    ])
  })

  it("still drops the exact owned target after pg_restore fails", async () => {
    const directory = await temporaryDirectory()
    const dump = join(directory, "cutover.dump")
    await writeFile(dump, "dump")
    const hash = await sha256File(dump)
    await writeFile(`${dump}.sha256`, `${hash}  cutover.dump\n`)
    const commands: string[] = []
    let psqlCall = 0
    const runner = processMock((command) => {
      commands.push(command)
      if (command === "psql") {
        psqlCall += 1
        return { stdout: ["0\n", "owned\n", "owned\n"][psqlCall - 1] }
      }
      if (command === "pg_restore") {
        throw new Error("mock restore failure")
      }
      return {}
    })

    await expect(
      restoreDrill({
        adminDatabaseUrl: databaseUrl(),
        dump,
        runner,
        sourceDatabase: "medusa",
        targetDatabase: "ro_demo_disposable_failure",
      })
    ).rejects.toThrow(RESTORE_FAILURE_PATTERN)
    expect(commands.at(-1)).toBe("dropdb")
  })

  it("still drops the exact owned target when an active restore is signalled", async () => {
    const directory = await temporaryDirectory()
    const dump = join(directory, "cutover.dump")
    await writeFile(dump, "dump")
    const hash = await sha256File(dump)
    await writeFile(`${dump}.sha256`, `${hash}  cutover.dump\n`)
    const abortController = new AbortController()
    const commands: string[] = []
    let psqlCall = 0
    const runner = processMock((command) => {
      commands.push(command)
      if (command === "psql") {
        psqlCall += 1
        return { stdout: ["0\n", "owned\n", "owned\n"][psqlCall - 1] }
      }
      if (command === "pg_restore") {
        abortController.abort()
        throw new Error("mock signal abort")
      }
      return {}
    })

    await expect(
      restoreDrill({
        adminDatabaseUrl: databaseUrl(),
        dump,
        runner,
        signal: abortController.signal,
        sourceDatabase: "medusa",
        targetDatabase: "ro_demo_disposable_signal",
      })
    ).rejects.toThrow(ABORT_FAILURE_PATTERN)
    expect(abortController.signal.aborted).toBe(true)
    expect(commands.at(-1)).toBe("dropdb")
  })

  it("does no database work when names collide or checksum fails", async () => {
    const directory = await temporaryDirectory()
    const dump = join(directory, "cutover.dump")
    await writeFile(dump, "dump")
    await writeFile(`${dump}.sha256`, `${"0".repeat(64)}  cutover.dump\n`)
    const runner = processMock(() => {
      throw new Error("must not execute")
    })

    await expect(
      restoreDrill({
        adminDatabaseUrl: databaseUrl("medusa"),
        dump,
        runner,
        sourceDatabase: "medusa",
        targetDatabase: "ro_demo_disposable_failure",
      })
    ).rejects.toThrow(DISTINCT_PATTERN)
    await expect(
      restoreDrill({
        adminDatabaseUrl: databaseUrl(),
        dump,
        runner,
        sourceDatabase: "medusa",
        targetDatabase: "ro_demo_disposable_failure",
      })
    ).rejects.toThrow(SHA256_ERROR_PATTERN)
    expect(runner).not.toHaveBeenCalled()
  })
})
