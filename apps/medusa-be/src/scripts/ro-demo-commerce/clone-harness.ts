import { spawn } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rm,
  unlink,
} from "node:fs/promises"
import { basename, dirname, isAbsolute, resolve } from "node:path"

export const DISPOSABLE_DATABASE_MARKER_VERSION =
  "herbatica-ro-demo-disposable-v1" as const

const DISPOSABLE_DATABASE_PREFIX = "ro_demo_disposable_"
const MARKER_TOKEN_PATTERN = /^[A-Za-z0-9._:-]{32,160}$/
const PLAN_HASH_PATTERN = /^[a-f0-9]{64}$/

export const redactProcessDiagnostic = (
  value: string,
  env: NodeJS.ProcessEnv
) => {
  const urlCredentialValues = [env.DATABASE_URL, env.LEGACY_DATABASE_URL]
    .filter((candidate): candidate is string => Boolean(candidate))
    .flatMap((candidate) => {
      try {
        const parsed = new URL(candidate)
        return [
          decodeURIComponent(parsed.username),
          decodeURIComponent(parsed.password),
        ]
      } catch {
        return []
      }
    })
  const sensitiveValues = [
    env.DATABASE_URL,
    env.LEGACY_DATABASE_URL,
    env.PGPASSWORD,
    ...urlCredentialValues,
  ].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.length >= 4
  )
  return sensitiveValues.reduce(
    (diagnostic, candidate) => diagnostic.replaceAll(candidate, "[REDACTED]"),
    value
  )
}

type ProcessRequest = Readonly<{
  args: readonly string[]
  command: string
  cwd?: string
  env: NodeJS.ProcessEnv
  signal?: AbortSignal
}>

type ProcessResult = Readonly<{
  stderr: string
  stdout: string
}>

export type CloneHarnessProcessRunner = (
  request: ProcessRequest
) => Promise<ProcessResult>

export type DisposableDatabaseTarget = Readonly<{
  databaseName: string
  databaseUrl: string
  postgresEnv: NodeJS.ProcessEnv
}>

type CommerceInvocation = Readonly<{
  confirmPlanHash?: string
  databaseUrl: string
  manifestPath: string
  mode: "apply" | "dry-run"
  planOutputPath: string
  workingDirectory: string
  signal?: AbortSignal
}>

export type CloneHarnessCommerceRunner = (
  invocation: CommerceInvocation
) => Promise<void>

export type RoDemoCommerceCloneHarnessOptions = Readonly<{
  databaseUrl: string
  manifestPath: string
  markerToken: string
  planOutputPath: string
  snapshotOutputPath: string
  signal?: AbortSignal
  workingDirectory: string
}>

export type RoDemoCommerceCloneHarnessReport = Readonly<{
  appliedDatabaseSha256: string
  dryRunDatabaseSha256: string
  idempotencyPlanHash: string
  initialDatabaseSha256: string
  planHash: string
  restoredDatabaseSha256: string
  rollbackVerified: true
}>

type CloneHarnessDependencies = Readonly<{
  processRunner?: CloneHarnessProcessRunner
  runCommerce?: CloneHarnessCommerceRunner
}>

const defaultProcessRunner: CloneHarnessProcessRunner = (request) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(request.command, [...request.args], {
      cwd: request.cwd,
      env: request.env,
      signal: request.signal,
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
    child.on("error", (error) => {
      reject(
        new Error(
          `${request.command} could not start: ${redactProcessDiagnostic(error.message, request.env)}`
        )
      )
    })
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolvePromise({ stderr, stdout })
        return
      }
      reject(
        new Error(
          `${request.command} failed (${signal ?? `exit ${String(code)}`}): ${redactProcessDiagnostic(stderr.trim(), request.env) || "no diagnostic output"}`
        )
      )
    })
  })

const assertAbsolutePath = (path: string, label: string) => {
  if (!(path && isAbsolute(path))) {
    throw new Error(`${label} must be an absolute path`)
  }
}

const sha256 = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex")

const normalizedDumpSha256 = async (path: string) => {
  const bytes = await readFile(path, "utf8")
  const normalized = bytes
    .replace(/^\\restrict\s+\S+\s*$/gm, "\\restrict TOKEN")
    .replace(/^\\unrestrict\s+\S+\s*$/gm, "\\unrestrict TOKEN")
  return sha256(normalized)
}

const fileSha256 = async (path: string) => sha256(await readFile(path))

const assertPathDoesNotExist = async (path: string, label: string) => {
  try {
    await lstat(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return
    }
    throw error
  }
  throw new Error(`${label} already exists; refusing to overwrite it`)
}

const unlinkOwnedPath = async (path: string) => {
  try {
    await unlink(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }
}

const inheritedProcessEnvironment = () => {
  const allowedNames = [
    "APPDATA",
    "CI",
    "ComSpec",
    "COREPACK_HOME",
    "HOME",
    "LANG",
    "LC_ALL",
    "LOCALAPPDATA",
    "LOGNAME",
    "PATH",
    "PATHEXT",
    "PNPM_HOME",
    "SHELL",
    "SystemRoot",
    "TEMP",
    "TERM",
    "TMP",
    "TMPDIR",
    "TZ",
    "USER",
    "USERPROFILE",
    "XDG_CACHE_HOME",
  ] as const
  return Object.fromEntries(
    allowedNames.flatMap((name) => {
      const value = process.env[name]
      return value === undefined ? [] : [[name, value]]
    })
  )
}

const postgresProcessEnvironment = (
  target: DisposableDatabaseTarget
): NodeJS.ProcessEnv => ({
  ...inheritedProcessEnvironment(),
  ...target.postgresEnv,
})

const acquireDisposableDatabaseLock = async (
  target: DisposableDatabaseTarget
) => {
  const identity = `loopback:${target.postgresEnv.PGPORT}/${target.databaseName}`
  const lockRoot = process.platform === "win32" ? "C:\\ProgramData" : "/tmp"
  const lockPath = resolve(
    lockRoot,
    `ro-demo-commerce-clone-${sha256(identity)}.lock`
  )
  const nonce = randomUUID()
  const handle = await open(lockPath, "wx", 0o600).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(
        `another clone harness owns the disposable database lock at ${lockPath}`
      )
    }
    throw error
  })
  await handle.writeFile(
    `${JSON.stringify({ databaseName: target.databaseName, nonce, pid: process.pid })}\n`,
    "utf8"
  )
  await handle.sync()
  await handle.close()
  return async () => {
    const current = JSON.parse(await readFile(lockPath, "utf8")) as {
      nonce?: unknown
    }
    if (current.nonce !== nonce) {
      throw new Error("disposable database lock ownership changed")
    }
    await unlink(lockPath)
  }
}

const scrubbedCommerceEnvironment = (
  databaseUrl: string,
  uploadDirectory: string
): NodeJS.ProcessEnv => ({
  ...inheritedProcessEnvironment(),
  ADMIN_CORS: "",
  AUTH_CORS: "",
  CACHE_PROVIDER: "inmemory",
  COOKIE_SECRET: "disposable-clone-cookie-secret-not-for-runtime-use",
  DATABASE_SCHEMA: "public",
  DATABASE_URL: databaseUrl,
  EVENT_BUS_PROVIDER: "local",
  FEATURE_GLS_ENABLED: "0",
  FEATURE_PACKETA_ENABLED: "0",
  FEATURE_PAYLOAD_ENABLED: "0",
  FEATURE_PAYMENT_QR_ENABLED: "0",
  FEATURE_PPL_ENABLED: "0",
  FILE_LOCAL_UPLOAD_DIR: uploadDirectory,
  FILE_PROVIDER: "local",
  LEGACY_DATABASE_URL: databaseUrl,
  LOCKING_PROVIDER: "postgres",
  MEDUSA_DATABASE_SCHEMA: "public",
  JWT_SECRET: "disposable-clone-jwt-secret-not-for-runtime-use",
  MEILISEARCH_API_KEY: "",
  MEILISEARCH_ENABLED: "0",
  MEILISEARCH_HOST: "",
  MINIO_ACCESS_KEY: "",
  MINIO_BUCKET: "",
  MINIO_ENDPOINT: "",
  MINIO_FILE_URL: "",
  MINIO_SECRET_KEY: "",
  NODE_ENV: "test",
  PAYLOAD_API_KEY: "",
  PAYLOAD_BASE_URL: "",
  REDIS_SESSIONS_ENABLED: "0",
  REDIS_URL: "",
  STORE_CORS: "",
  WORKFLOW_ENGINE_PROVIDER: "inmemory",
})

export const parseDisposableDatabaseTarget = (
  databaseUrl: string,
  markerToken: string
): DisposableDatabaseTarget => {
  if (!MARKER_TOKEN_PATTERN.test(markerToken)) {
    throw new Error(
      "RO_DEMO_DISPOSABLE_MARKER must be 32-160 safe non-whitespace characters"
    )
  }
  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new Error("disposable database URL is invalid")
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("disposable database URL must use postgres or postgresql")
  }
  const rawHostname = parsed.hostname.toLowerCase()
  const hostname = rawHostname === "[::1]" ? "::1" : rawHostname
  if (!new Set(["127.0.0.1", "::1", "localhost"]).has(hostname)) {
    throw new Error("disposable database host must be loopback")
  }
  const databaseName = decodeURIComponent(parsed.pathname.slice(1))
  if (
    !new RegExp(`^${DISPOSABLE_DATABASE_PREFIX}[a-z0-9_]+$`).test(databaseName)
  ) {
    throw new Error(
      `disposable database name must start with ${DISPOSABLE_DATABASE_PREFIX}`
    )
  }
  if (parsed.pathname.slice(1).includes("/") || !parsed.username) {
    throw new Error("disposable database URL must name one database and user")
  }
  const allowedSearchParameters = new Set(["sslmode"])
  for (const key of parsed.searchParams.keys()) {
    if (!allowedSearchParameters.has(key)) {
      throw new Error(`disposable database URL option ${key} is not allowed`)
    }
  }
  const sslMode = parsed.searchParams.get("sslmode")
  if (sslMode && sslMode !== "disable") {
    throw new Error("loopback disposable database must use sslmode=disable")
  }
  return {
    databaseName,
    databaseUrl,
    postgresEnv: {
      PGAPPNAME: "ro-demo-commerce-clone-harness",
      PGDATABASE: databaseName,
      PGHOST: hostname,
      PGOPTIONS: "-c statement_timeout=300000 -c lock_timeout=30000",
      PGPASSWORD: decodeURIComponent(parsed.password),
      PGPORT: parsed.port || "5432",
      PGSSLMODE: "disable",
      PGUSER: decodeURIComponent(parsed.username),
    },
  }
}

const assertDisposableDatabaseMarker = async (
  target: DisposableDatabaseTarget,
  markerToken: string,
  processRunner: CloneHarnessProcessRunner
) => {
  const markerQuery = [
    "SELECT current_database() || chr(9) || COALESCE(shobj_description(oid, 'pg_database'), '')",
    "FROM pg_database WHERE datname = current_database();",
  ].join(" ")
  let result: ProcessResult
  try {
    result = await processRunner({
      args: [
        "--no-psqlrc",
        "--set=ON_ERROR_STOP=1",
        "--tuples-only",
        "--no-align",
        "--command",
        markerQuery,
      ],
      command: "psql",
      env: postgresProcessEnvironment(target),
    })
  } catch (error) {
    throw new Error(
      `disposable database marker could not be verified: ${
        error instanceof Error ? error.message : "unknown PostgreSQL error"
      }`
    )
  }
  const rows = result.stdout
    .trim()
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
  const expected = `${target.databaseName}\t${DISPOSABLE_DATABASE_MARKER_VERSION}:${markerToken}`
  if (rows.length !== 1 || rows[0] !== expected) {
    throw new Error("disposable database marker does not match")
  }
}

const assertRestorePrivileges = async (
  target: DisposableDatabaseTarget,
  processRunner: CloneHarnessProcessRunner
) => {
  const result = await processRunner({
    args: [
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--command",
      "SELECT rolsuper FROM pg_roles WHERE rolname = current_user;",
    ],
    command: "psql",
    env: postgresProcessEnvironment(target),
  })
  if (result.stdout.trim() !== "t") {
    throw new Error(
      "disposable database user must be a PostgreSQL superuser for exact drop/create ownership and ACL restore"
    )
  }
}

const captureDatabase = async (
  target: DisposableDatabaseTarget,
  outputPath: string,
  processRunner: CloneHarnessProcessRunner
) => {
  assertAbsolutePath(outputPath, "snapshot output")
  await assertPathDoesNotExist(outputPath, "snapshot output")
  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 })
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`
  const handle = await open(temporaryPath, "wx", 0o600)
  await handle.close()
  try {
    await processRunner({
      args: [
        "--clean",
        "--create",
        "--if-exists",
        "--format=plain",
        "--file",
        temporaryPath,
      ],
      command: "pg_dump",
      env: postgresProcessEnvironment(target),
    })
    await chmod(temporaryPath, 0o600)
    await link(temporaryPath, outputPath)
  } finally {
    await unlink(temporaryPath)
  }
  return normalizedDumpSha256(outputPath)
}

const restoreDatabase = async ({
  expectedSnapshotSha256,
  markerToken,
  processRunner,
  snapshotPath,
  target,
}: Readonly<{
  expectedSnapshotSha256: string
  markerToken: string
  processRunner: CloneHarnessProcessRunner
  snapshotPath: string
  target: DisposableDatabaseTarget
}>) => {
  await assertDisposableDatabaseMarker(target, markerToken, processRunner)
  if ((await fileSha256(snapshotPath)) !== expectedSnapshotSha256) {
    throw new Error("rollback snapshot integrity check failed")
  }
  const maintenanceTarget: DisposableDatabaseTarget = {
    ...target,
    postgresEnv: { ...target.postgresEnv, PGDATABASE: "postgres" },
  }
  await processRunner({
    args: [
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--command",
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${target.databaseName}' AND pid <> pg_backend_pid();`,
    ],
    command: "psql",
    env: postgresProcessEnvironment(maintenanceTarget),
  })
  await processRunner({
    args: ["--no-psqlrc", "--set=ON_ERROR_STOP=1", "--file", snapshotPath],
    command: "psql",
    env: postgresProcessEnvironment(maintenanceTarget),
  })
  await assertDisposableDatabaseMarker(target, markerToken, processRunner)
}

const defaultCommerceRunner =
  (processRunner: CloneHarnessProcessRunner): CloneHarnessCommerceRunner =>
  async (invocation) => {
    const uploadDirectory = `${invocation.planOutputPath}.local-files`
    const runtimePath = resolve(__dirname, "runtime.ts")
    await mkdir(uploadDirectory, { recursive: false, mode: 0o700 })
    const args = [
      "exec",
      "medusa",
      "exec",
      runtimePath,
      "--manifest",
      invocation.manifestPath,
      "--plan-output",
      invocation.planOutputPath,
    ]
    if (invocation.mode === "apply") {
      if (!invocation.confirmPlanHash) {
        throw new Error("apply requires a confirmed plan hash")
      }
      args.push(
        "--demo",
        "--apply",
        "--confirm-plan-hash",
        invocation.confirmPlanHash
      )
    }
    try {
      await processRunner({
        args,
        command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
        cwd: invocation.workingDirectory,
        env: scrubbedCommerceEnvironment(
          invocation.databaseUrl,
          uploadDirectory
        ),
        signal: invocation.signal,
      })
    } finally {
      await rm(uploadDirectory, { force: false, recursive: true })
    }
  }

const writePrivateJson = async (path: string, value: unknown) => {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`
  await assertPathDoesNotExist(path, "report output")
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const handle = await open(temporaryPath, "wx", 0o600)
  let closed = false
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8")
    await handle.sync()
    await handle.close()
    closed = true
    await link(temporaryPath, path)
  } finally {
    if (!closed) {
      await handle.close().catch(() => {
        // Preserve the original atomic-write failure.
      })
    }
    await unlinkOwnedPath(temporaryPath)
  }
}

const assertHarnessArtifactPaths = async (
  options: RoDemoCommerceCloneHarnessOptions,
  artifactPaths: readonly string[]
) => {
  assertAbsolutePath(options.manifestPath, "manifest")
  assertAbsolutePath(options.planOutputPath, "plan output")
  assertAbsolutePath(options.snapshotOutputPath, "snapshot output")
  if (!isAbsolute(options.workingDirectory)) {
    throw new Error("working directory must be absolute")
  }
  await Promise.all(
    artifactPaths.map((path) =>
      mkdir(dirname(path), { recursive: true, mode: 0o700 })
    )
  )
  const canonicalArtifactPaths = await Promise.all(
    artifactPaths.map(async (path) =>
      resolve(
        await realpath(dirname(path)),
        basename(path).toLocaleLowerCase("en-US")
      )
    )
  )
  if (new Set(canonicalArtifactPaths).size !== canonicalArtifactPaths.length) {
    throw new Error("clone harness artifact paths must be distinct")
  }
  await Promise.all(
    artifactPaths.map((path) => assertPathDoesNotExist(path, "artifact output"))
  )
}

export const runRoDemoCommerceCloneHarness = async (
  options: RoDemoCommerceCloneHarnessOptions,
  dependencies: CloneHarnessDependencies = {}
): Promise<RoDemoCommerceCloneHarnessReport> => {
  const target = parseDisposableDatabaseTarget(
    options.databaseUrl,
    options.markerToken
  )
  const processRunner = dependencies.processRunner ?? defaultProcessRunner
  const runCommerce =
    dependencies.runCommerce ?? defaultCommerceRunner(processRunner)
  const postDryRunPath = `${options.snapshotOutputPath}.after-dry-run.sql`
  const postApplyPath = `${options.snapshotOutputPath}.after-apply.sql`
  const postSecondApplyPath = `${options.snapshotOutputPath}.after-second-apply.sql`
  const restoredPath = `${options.snapshotOutputPath}.restored.sql`
  const idempotencyPlanPath = `${options.planOutputPath}.idempotency.json`
  const artifactPaths = [
    options.planOutputPath,
    options.snapshotOutputPath,
    postDryRunPath,
    postApplyPath,
    postSecondApplyPath,
    restoredPath,
    idempotencyPlanPath,
  ]
  let initialDatabaseSha256: string | undefined
  let initialSnapshotSha256: string | undefined
  let rollbackComplete = false
  let databaseCommandStarted = false
  const ownedEphemeralPaths = new Set<string>()
  const releaseDatabaseLock = await acquireDisposableDatabaseLock(target)
  const assertNotAborted = () => options.signal?.throwIfAborted()

  try {
    assertNotAborted()
    await assertHarnessArtifactPaths(options, artifactPaths)
    await assertDisposableDatabaseMarker(
      target,
      options.markerToken,
      processRunner
    )
    await assertRestorePrivileges(target, processRunner)
    assertNotAborted()
    initialDatabaseSha256 = await captureDatabase(
      target,
      options.snapshotOutputPath,
      processRunner
    )
    initialSnapshotSha256 = await fileSha256(options.snapshotOutputPath)
    databaseCommandStarted = true
    assertNotAborted()
    await runCommerce({
      databaseUrl: target.databaseUrl,
      manifestPath: options.manifestPath,
      mode: "dry-run",
      planOutputPath: options.planOutputPath,
      workingDirectory: options.workingDirectory,
      signal: options.signal,
    })
    const dryRunDatabaseSha256 = await captureDatabase(
      target,
      postDryRunPath,
      processRunner
    )
    ownedEphemeralPaths.add(postDryRunPath)
    if (dryRunDatabaseSha256 !== initialDatabaseSha256) {
      throw new Error("commerce dry-run changed the disposable database")
    }
    const planHash = await fileSha256(options.planOutputPath)
    if (!PLAN_HASH_PATTERN.test(planHash)) {
      throw new Error("commerce dry-run did not produce a valid plan hash")
    }
    await assertDisposableDatabaseMarker(
      target,
      options.markerToken,
      processRunner
    )
    assertNotAborted()
    await runCommerce({
      confirmPlanHash: planHash,
      databaseUrl: target.databaseUrl,
      manifestPath: options.manifestPath,
      mode: "apply",
      planOutputPath: options.planOutputPath,
      workingDirectory: options.workingDirectory,
      signal: options.signal,
    })
    const appliedDatabaseSha256 = await captureDatabase(
      target,
      postApplyPath,
      processRunner
    )
    ownedEphemeralPaths.add(postApplyPath)
    if (appliedDatabaseSha256 === initialDatabaseSha256) {
      throw new Error("commerce apply produced no database change")
    }
    ownedEphemeralPaths.add(idempotencyPlanPath)
    assertNotAborted()
    await runCommerce({
      databaseUrl: target.databaseUrl,
      manifestPath: options.manifestPath,
      mode: "dry-run",
      planOutputPath: idempotencyPlanPath,
      workingDirectory: options.workingDirectory,
      signal: options.signal,
    })
    const idempotencyPlanHash = await fileSha256(idempotencyPlanPath)
    await assertDisposableDatabaseMarker(
      target,
      options.markerToken,
      processRunner
    )
    assertNotAborted()
    await runCommerce({
      confirmPlanHash: idempotencyPlanHash,
      databaseUrl: target.databaseUrl,
      manifestPath: options.manifestPath,
      mode: "apply",
      planOutputPath: idempotencyPlanPath,
      workingDirectory: options.workingDirectory,
      signal: options.signal,
    })
    const secondAppliedDatabaseSha256 = await captureDatabase(
      target,
      postSecondApplyPath,
      processRunner
    )
    ownedEphemeralPaths.add(postSecondApplyPath)
    if (secondAppliedDatabaseSha256 !== appliedDatabaseSha256) {
      throw new Error("second commerce apply did not converge")
    }
    await restoreDatabase({
      target,
      markerToken: options.markerToken,
      snapshotPath: options.snapshotOutputPath,
      expectedSnapshotSha256: initialSnapshotSha256,
      processRunner,
    })
    const restoredDatabaseSha256 = await captureDatabase(
      target,
      restoredPath,
      processRunner
    )
    ownedEphemeralPaths.add(restoredPath)
    if (restoredDatabaseSha256 !== initialDatabaseSha256) {
      throw new Error("rollback did not restore the original database dump")
    }
    rollbackComplete = true
    return {
      appliedDatabaseSha256,
      dryRunDatabaseSha256,
      idempotencyPlanHash,
      initialDatabaseSha256,
      planHash,
      restoredDatabaseSha256,
      rollbackVerified: true,
    }
  } catch (error) {
    if (databaseCommandStarted && initialSnapshotSha256 && !rollbackComplete) {
      try {
        await restoreDatabase({
          target,
          markerToken: options.markerToken,
          snapshotPath: options.snapshotOutputPath,
          expectedSnapshotSha256: initialSnapshotSha256,
          processRunner,
        })
      } catch (rollbackError) {
        const primaryMessage =
          error instanceof Error ? error.message : "unknown primary error"
        const rollbackMessage =
          rollbackError instanceof Error
            ? rollbackError.message
            : "unknown rollback error"
        throw new AggregateError(
          [error, rollbackError],
          `clone verification failed (${primaryMessage}) and disposable rollback also failed (${rollbackMessage})`
        )
      }
    }
    throw error
  } finally {
    await Promise.all([
      Promise.all([...ownedEphemeralPaths].map(unlinkOwnedPath)),
      releaseDatabaseLock(),
    ])
  }
}

export const writeRoDemoCommerceCloneHarnessReport = writePrivateJson
