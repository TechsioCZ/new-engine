import { spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { createReadStream } from "node:fs"
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

export const DISPOSABLE_PREFIX = "ro_demo_disposable_"
export const DISPOSABLE_MARKER_PREFIX = "ro-cutover-backup:owned-disposable:v1:"
export const SHA256_PATTERN = /^[a-f0-9]{64}$/
const DATABASE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_$-]{0,62}$/
const DISPOSABLE_NAME_PATTERN =
  /^ro_demo_disposable_[a-z0-9](?:[a-z0-9_]{0,43}[a-z0-9])?$/
const ENV_NAME_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/
const BUCKET_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{1,61}[a-z0-9])?$/
const OBJECT_KEY_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._/-]{0,1022}[A-Za-z0-9._-])?$/
const IPV4_ADDRESS_PATTERN = /^\d+\.\d+\.\d+\.\d+$/u
const SERVER_VERSION_PATTERN = /^\d{5,6}$/u
const CHECKSUM_LINE_PATTERN = /^([a-f0-9]{64})(?:\s|$)/u
const MAX_CHILD_OUTPUT_BYTES = 32 * 1024

export type ChildResult = Readonly<{ stderr: string; stdout: string }>
export type RunOptions = Readonly<{
  env: Readonly<Record<string, string>>
  signal?: AbortSignal
  sensitiveValues?: readonly string[]
}>
export type ProcessRunner = (
  command: string,
  args: readonly string[],
  options: RunOptions
) => Promise<ChildResult>

export class CutoverSafetyError extends Error {
  override readonly name = "CutoverSafetyError"
}

function fail(message: string): never {
  throw new CutoverSafetyError(message)
}

function requireNonempty(value: string | undefined, label: string): string {
  if (!value?.trim()) {
    fail(`${label} is required`)
  }
  return value.trim()
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length && leftBuffer.equals(rightBuffer)
  )
}

export function redact(
  text: string,
  sensitiveValues: readonly string[] = []
): string {
  let sanitized = text
  for (const value of sensitiveValues) {
    if (value.length >= 4) {
      sanitized = sanitized.split(value).join("[REDACTED]")
    }
  }
  return sanitized
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/[^\s"']+/giu, "[REDACTED_URL]")
    .replace(
      /\b(?:AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|PGPASSWORD|password|secret|token)\s*[=:]\s*[^\s,;]+/giu,
      "[REDACTED_SECRET]"
    )
    .replace(
      /X-Amz-(?:Credential|Signature|Security-Token)=[^&\s]+/giu,
      "X-Amz-Parameter=[REDACTED]"
    )
}

function appendCapped(
  chunks: Buffer[],
  chunk: Buffer | string,
  state: { bytes: number }
): void {
  if (state.bytes >= MAX_CHILD_OUTPUT_BYTES) {
    return
  }
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
  const remaining = MAX_CHILD_OUTPUT_BYTES - state.bytes
  chunks.push(buffer.subarray(0, remaining))
  state.bytes += Math.min(buffer.length, remaining)
}

export const runChild: ProcessRunner = async (command, args, options) => {
  if (!command || args.some((arg) => arg.includes("\0"))) {
    fail("invalid child process command")
  }
  return await new Promise<ChildResult>((resolvePromise, reject) => {
    const child = spawn(command, [...args], {
      env: { ...options.env },
      shell: false,
      signal: options.signal,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const stdoutState = { bytes: 0 }
    const stderrState = { bytes: 0 }
    child.stdout.on("data", (chunk: Buffer) =>
      appendCapped(stdoutChunks, chunk, stdoutState)
    )
    child.stderr.on("data", (chunk: Buffer) =>
      appendCapped(stderrChunks, chunk, stderrState)
    )
    child.once("error", (error) =>
      reject(
        new CutoverSafetyError(
          `${basename(command)} failed: ${redact(error.message, options.sensitiveValues)}`
        )
      )
    )
    child.once("close", (code, signal) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8")
      const stderr = Buffer.concat(stderrChunks).toString("utf8")
      if (code !== 0) {
        const detail = redact(stderr, options.sensitiveValues).trim()
        reject(
          new CutoverSafetyError(
            `${basename(command)} failed (${signal ? `signal ${signal}` : `exit ${code ?? "unknown"}`})${detail ? `: ${detail}` : ""}`
          )
        )
        return
      }
      resolvePromise({
        stderr: redact(stderr, options.sensitiveValues),
        stdout,
      })
    })
  })
}

export function assertPairwiseDistinct(
  values: Readonly<Record<string, string>>
): void {
  const seen = new Map<string, string>()
  for (const [label, rawValue] of Object.entries(values)) {
    const value = rawValue.trim().toLowerCase()
    const previous = seen.get(value)
    if (previous) {
      fail(`${label} must be distinct from ${previous}`)
    }
    seen.set(value, label)
  }
}

export function parseCliArgs(argv: readonly string[]): {
  command: string
  options: Readonly<Record<string, string>>
} {
  const command = argv[0] ?? "idle"
  if (command.startsWith("-")) {
    fail("the first argument must be a subcommand")
  }
  const options: Record<string, string> = {}
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (
      !flag?.startsWith("--") ||
      flag === "--" ||
      value === undefined ||
      value.startsWith("--")
    ) {
      fail("options must be supplied as unique --name value pairs")
    }
    const name = flag.slice(2)
    if (Object.hasOwn(options, name)) {
      fail(`duplicate option: --${name}`)
    }
    options[name] = value
  }
  return { command, options }
}

function rejectUnknownOptions(
  options: Readonly<Record<string, string>>,
  allowed: readonly string[]
): void {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(options).filter((name) => !allowedSet.has(name))
  if (unknown.length > 0) {
    fail(`unknown option(s): ${unknown.map((name) => `--${name}`).join(", ")}`)
  }
}

export function readSecretEnv(
  envName: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (!ENV_NAME_PATTERN.test(envName)) {
    fail("database URL environment variable name is invalid")
  }
  return requireNonempty(env[envName], envName)
}

export type DatabaseIdentity = Readonly<{
  database: string
  host: string
  port: string
  user: string
}>

function decodeUrlPart(value: string, label: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    fail(`database URL ${label} is malformed`)
  }
}

const DATABASE_PARAMETER_ENV = {
  connect_timeout: "PGCONNECT_TIMEOUT",
  options: "PGOPTIONS",
  sslcert: "PGSSLCERT",
  sslkey: "PGSSLKEY",
  sslmode: "PGSSLMODE",
  sslrootcert: "PGSSLROOTCERT",
} as const

function addDatabaseUrlParameters(
  url: URL,
  childEnv: Record<string, string>
): void {
  for (const [key, value] of url.searchParams) {
    const environmentName =
      DATABASE_PARAMETER_ENV[key as keyof typeof DATABASE_PARAMETER_ENV]
    if (!environmentName) {
      fail(`database URL parameter is not allowed: ${key}`)
    }
    if (value) {
      childEnv[environmentName] = value
    }
  }
}

export function parseDatabaseUrl(urlValue: string): {
  childEnv: Readonly<Record<string, string>>
  identity: DatabaseIdentity
  secrets: readonly string[]
} {
  let url: URL
  try {
    url = new URL(urlValue)
  } catch {
    fail("database URL is invalid")
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    fail("database URL must use postgres:// or postgresql://")
  }
  if (url.hash) {
    fail("database URL fragments are forbidden")
  }
  const database = decodeUrlPart(
    url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname,
    "database"
  )
  const user = decodeUrlPart(url.username, "user")
  const password = decodeUrlPart(url.password, "password")
  if (
    !(url.hostname && database && user && DATABASE_NAME_PATTERN.test(database))
  ) {
    fail("database URL must contain a host, user, and safe database name")
  }
  const childEnv: Record<string, string> = {
    HOME: "/tmp/cutover",
    LANG: "C",
    LC_ALL: "C",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    PGDATABASE: database,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: user,
  }
  if (password) {
    childEnv.PGPASSWORD = password
  }
  addDatabaseUrlParameters(url, childEnv)
  return {
    childEnv,
    identity: { database, host: url.hostname, port: url.port || "5432", user },
    secrets: [urlValue, password].filter(Boolean),
  }
}

function databaseEnv(
  parsed: ReturnType<typeof parseDatabaseUrl>,
  database: string
): Readonly<Record<string, string>> {
  if (!DATABASE_NAME_PATTERN.test(database)) {
    fail("database name is unsafe")
  }
  return { ...parsed.childEnv, PGDATABASE: database }
}

export function validateEndpoint(endpointValue: string): URL {
  let endpoint: URL
  try {
    endpoint = new URL(endpointValue)
  } catch {
    fail("S3 endpoint is invalid")
  }
  if (
    endpoint.protocol !== "https:" ||
    !endpoint.hostname ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    (endpoint.pathname !== "/" && endpoint.pathname !== "")
  ) {
    fail(
      "S3 endpoint must be a credential-free HTTPS origin without a path, query, or fragment"
    )
  }
  return endpoint
}

export function validateBucket(bucket: string): string {
  if (
    !BUCKET_PATTERN.test(bucket) ||
    bucket.includes("..") ||
    IPV4_ADDRESS_PATTERN.test(bucket)
  ) {
    fail("S3 bucket name is invalid")
  }
  return bucket
}

export function validateObjectKey(key: string): string {
  if (
    !OBJECT_KEY_PATTERN.test(key) ||
    key.startsWith("/") ||
    key.includes("//") ||
    key.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    fail("S3 object key is invalid")
  }
  return key
}

function rcloneEnv(
  endpoint: URL,
  env: NodeJS.ProcessEnv = process.env
): {
  childEnv: Readonly<Record<string, string>>
  secrets: readonly string[]
} {
  const accessKey = requireNonempty(env.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID")
  const secretKey = requireNonempty(
    env.AWS_SECRET_ACCESS_KEY,
    "AWS_SECRET_ACCESS_KEY"
  )
  const sessionToken = env.AWS_SESSION_TOKEN?.trim()
  const childEnv: Record<string, string> = {
    AWS_ACCESS_KEY_ID: accessKey,
    AWS_SECRET_ACCESS_KEY: secretKey,
    HOME: "/tmp/cutover",
    LANG: "C",
    LC_ALL: "C",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    RCLONE_CONFIG_CUTOVER_ENDPOINT: endpoint.origin,
    RCLONE_CONFIG_CUTOVER_ENV_AUTH: "true",
    RCLONE_CONFIG_CUTOVER_PROVIDER: "Other",
    RCLONE_CONFIG_CUTOVER_TYPE: "s3",
    RCLONE_LOG_LEVEL: "ERROR",
    XDG_CACHE_HOME: "/tmp/cutover/cache",
    XDG_CONFIG_HOME: "/tmp/cutover/config",
  }
  if (sessionToken) {
    childEnv.AWS_SESSION_TOKEN = sessionToken
  }
  if (env.AWS_REGION?.trim()) {
    childEnv.AWS_REGION = env.AWS_REGION.trim()
  }
  return {
    childEnv,
    secrets: [accessKey, secretKey, sessionToken ?? ""].filter(Boolean),
  }
}

function assertExpectedDatabase(
  identity: DatabaseIdentity,
  expectedDatabase: string
): void {
  if (
    !DATABASE_NAME_PATTERN.test(expectedDatabase) ||
    identity.database !== expectedDatabase
  ) {
    fail("database URL identity does not match --expected-db")
  }
}

export async function preflightDatabase(
  runner: ProcessRunner,
  databaseUrl: string,
  expectedDatabase: string,
  signal?: AbortSignal
): Promise<DatabaseIdentity & { serverVersion: string }> {
  const parsed = parseDatabaseUrl(databaseUrl)
  assertExpectedDatabase(parsed.identity, expectedDatabase)
  const result = await runner(
    "psql",
    [
      "--no-psqlrc",
      "--no-password",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--field-separator=|",
      "--command=SELECT current_database(), current_user, current_setting('server_version_num');",
    ],
    { env: parsed.childEnv, sensitiveValues: parsed.secrets, signal }
  )
  const [database, user, serverVersion, extra] = result.stdout.trim().split("|")
  if (
    extra !== undefined ||
    database !== expectedDatabase ||
    !user ||
    !SERVER_VERSION_PATTERN.test(serverVersion ?? "")
  ) {
    fail("database preflight returned an unexpected identity")
  }
  return { ...parsed.identity, serverVersion: serverVersion ?? "", user }
}

export async function preflightPrivateTarget(input: {
  bucket: string
  endpoint: string
  env?: NodeJS.ProcessEnv
  runner: ProcessRunner
  signal?: AbortSignal
}): Promise<{ bucket: string; endpointHost: string }> {
  const endpoint = validateEndpoint(input.endpoint)
  const bucket = validateBucket(input.bucket)
  const transfer = rcloneEnv(endpoint, input.env)
  await input.runner("rclone", ["lsd", `cutover:${bucket}`, "--max-depth=1"], {
    env: transfer.childEnv,
    sensitiveValues: transfer.secrets,
    signal: input.signal,
  })
  return { bucket, endpointHost: endpoint.host }
}

async function reserveFile(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const handle = await open(path, "wx", 0o600).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "EEXIST") {
        fail(`refusing to overwrite existing file: ${path}`)
      }
      throw error
    }
  )
  await handle.close()
  await chmod(path, 0o600)
}

async function assertRegularFile(path: string, label: string): Promise<void> {
  const fileStat = await lstat(path).catch(() =>
    fail(`${label} does not exist`)
  )
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    fail(`${label} must be a regular file`)
  }
}

export async function sha256File(path: string): Promise<string> {
  await assertRegularFile(path, "hash input")
  const hash = createHash("sha256")
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer)
  }
  return hash.digest("hex")
}

export function parseChecksumFile(contents: string): string {
  const match = CHECKSUM_LINE_PATTERN.exec(contents.trim())
  if (!match?.[1]) {
    fail("checksum file is malformed")
  }
  return match[1]
}

export async function verifyLocalChecksum(
  file: string,
  checksumFile = `${file}.sha256`
): Promise<string> {
  assertPairwiseDistinct({
    checksumFile: resolve(checksumFile),
    file: resolve(file),
  })
  const expected = parseChecksumFile(await readFile(checksumFile, "utf8"))
  const actual = await sha256File(file)
  if (!safeEqual(actual, expected)) {
    fail("SHA256 verification failed")
  }
  return actual
}

function temporarySibling(path: string): string {
  return join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`
  )
}

async function removeIfPresent(path: string): Promise<void> {
  await unlink(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error
    }
  })
}

export async function createBackup(input: {
  databaseUrl: string
  expectedDatabase: string
  output: string
  runner?: ProcessRunner
  signal?: AbortSignal
}): Promise<{ bytes: number; checksumFile: string; sha256: string }> {
  const runner = input.runner ?? runChild
  const output = resolve(input.output)
  const checksumFile = `${output}.sha256`
  assertPairwiseDistinct({ checksumFile, output })
  const parsed = parseDatabaseUrl(input.databaseUrl)
  const temporary = temporarySibling(output)
  let committed = false
  await reserveFile(output)
  try {
    await reserveFile(checksumFile)
    await preflightDatabase(
      runner,
      input.databaseUrl,
      input.expectedDatabase,
      input.signal
    )
    await reserveFile(temporary)
    await runner(
      "pg_dump",
      [
        "--format=custom",
        "--compress=9",
        "--no-password",
        "--lock-wait-timeout=30000",
        `--file=${temporary}`,
      ],
      {
        env: parsed.childEnv,
        sensitiveValues: parsed.secrets,
        signal: input.signal,
      }
    )
    const dumpStat = await stat(temporary)
    if (!dumpStat.isFile() || dumpStat.size === 0) {
      fail("pg_dump did not create a non-empty custom-format backup")
    }
    await chmod(temporary, 0o600)
    const sha256 = await sha256File(temporary)
    await copyFile(temporary, output)
    await chmod(output, 0o600)
    await writeFile(checksumFile, `${sha256}  ${basename(output)}\n`, {
      mode: 0o600,
    })
    await chmod(checksumFile, 0o600)
    committed = true
    return { bytes: dumpStat.size, checksumFile, sha256 }
  } finally {
    await removeIfPresent(temporary)
    if (!committed) {
      await Promise.allSettled([
        removeIfPresent(output),
        removeIfPresent(checksumFile),
      ])
    }
  }
}

function remotePath(bucket: string, key: string): string {
  return `cutover:${validateBucket(bucket)}/${validateObjectKey(key)}`
}

export async function uploadBackup(input: {
  bucket: string
  checksumFile?: string
  endpoint: string
  env?: NodeJS.ProcessEnv
  file: string
  objectKey: string
  runner?: ProcessRunner
  signal?: AbortSignal
}): Promise<{ sha256: string }> {
  const runner = input.runner ?? runChild
  const endpoint = validateEndpoint(input.endpoint)
  const file = resolve(input.file)
  const checksumFile = resolve(input.checksumFile ?? `${file}.sha256`)
  const checksumKey = `${validateObjectKey(input.objectKey)}.sha256`
  assertPairwiseDistinct({ checksumFile, file })
  assertPairwiseDistinct({ checksumKey, objectKey: input.objectKey })
  await Promise.all([
    assertRegularFile(file, "backup"),
    assertRegularFile(checksumFile, "checksum"),
  ])
  const sha256 = await verifyLocalChecksum(file, checksumFile)
  const transfer = rcloneEnv(endpoint, input.env)
  const common = {
    env: transfer.childEnv,
    sensitiveValues: transfer.secrets,
    signal: input.signal,
  }
  await runner(
    "rclone",
    [
      "copyto",
      file,
      remotePath(input.bucket, input.objectKey),
      "--immutable",
      "--no-traverse",
    ],
    common
  )
  await runner(
    "rclone",
    [
      "copyto",
      checksumFile,
      remotePath(input.bucket, checksumKey),
      "--immutable",
      "--no-traverse",
    ],
    common
  )
  return { sha256 }
}

export async function downloadBackup(input: {
  bucket: string
  checksumFile?: string
  endpoint: string
  env?: NodeJS.ProcessEnv
  objectKey: string
  output: string
  runner?: ProcessRunner
  signal?: AbortSignal
}): Promise<{ checksumFile: string; sha256: string }> {
  const runner = input.runner ?? runChild
  const endpoint = validateEndpoint(input.endpoint)
  const output = resolve(input.output)
  const checksumFile = resolve(input.checksumFile ?? `${output}.sha256`)
  const objectKey = validateObjectKey(input.objectKey)
  const checksumKey = `${objectKey}.sha256`
  assertPairwiseDistinct({ checksumFile, output })
  assertPairwiseDistinct({ checksumKey, objectKey })
  const temporary = temporarySibling(output)
  const temporaryChecksum = `${temporary}.sha256`
  const transfer = rcloneEnv(endpoint, input.env)
  let committed = false
  await reserveFile(output)
  try {
    await reserveFile(checksumFile)
    const common = {
      env: transfer.childEnv,
      sensitiveValues: transfer.secrets,
      signal: input.signal,
    }
    await runner(
      "rclone",
      [
        "copyto",
        remotePath(input.bucket, objectKey),
        temporary,
        "--immutable",
        "--no-traverse",
      ],
      common
    )
    await runner(
      "rclone",
      [
        "copyto",
        remotePath(input.bucket, checksumKey),
        temporaryChecksum,
        "--immutable",
        "--no-traverse",
      ],
      common
    )
    const sha256 = await verifyLocalChecksum(temporary, temporaryChecksum)
    await copyFile(temporary, output)
    await copyFile(temporaryChecksum, checksumFile)
    await Promise.all([chmod(output, 0o600), chmod(checksumFile, 0o600)])
    committed = true
    return { checksumFile, sha256 }
  } finally {
    await Promise.allSettled([
      removeIfPresent(temporary),
      removeIfPresent(temporaryChecksum),
    ])
    if (!committed) {
      await Promise.allSettled([
        removeIfPresent(output),
        removeIfPresent(checksumFile),
      ])
    }
  }
}

export async function verifyRoundtrip(input: {
  bucket: string
  endpoint: string
  env?: NodeJS.ProcessEnv
  file: string
  objectKey: string
  runner?: ProcessRunner
  signal?: AbortSignal
}): Promise<{ sha256: string }> {
  const localHash = await verifyLocalChecksum(input.file)
  const directory = await mkdtemp(join(tmpdir(), "ro-cutover-roundtrip-"))
  const downloaded = join(directory, "roundtrip.dump")
  try {
    const result = await downloadBackup({ ...input, output: downloaded })
    if (!safeEqual(localHash, result.sha256)) {
      fail("roundtrip SHA256 does not match the source backup")
    }
    return { sha256: result.sha256 }
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
}

export function assertDisposableDatabaseName(name: string): string {
  if (!DISPOSABLE_NAME_PATTERN.test(name) || name.length > 63) {
    fail(`restore target must match ${DISPOSABLE_PREFIX}<safe-suffix>`)
  }
  return name
}

export function disposableMarker(name: string): string {
  return `${DISPOSABLE_MARKER_PREFIX}${assertDisposableDatabaseName(name)}`
}

const TARGET_EXISTS_SQL =
  "SELECT count(*) FROM pg_database WHERE datname = :'target';"
const OWNERSHIP_SQL =
  "SELECT CASE WHEN d.datdba = (SELECT oid FROM pg_roles WHERE rolname = current_user) AND shobj_description(d.oid, 'pg_database') = :'marker' THEN 'owned' ELSE 'unsafe' END FROM pg_database d WHERE d.datname = :'target';"

async function queryAdmin(input: {
  parsed: ReturnType<typeof parseDatabaseUrl>
  runner: ProcessRunner
  signal?: AbortSignal
  sql: string
  variables: Readonly<Record<string, string>>
}): Promise<string> {
  const variableArgs = Object.entries(input.variables).map(
    ([key, value]) => `--set=${key}=${value}`
  )
  const result = await input.runner(
    "psql",
    [
      "--no-psqlrc",
      "--no-password",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      ...variableArgs,
      `--command=${input.sql}`,
    ],
    {
      env: input.parsed.childEnv,
      sensitiveValues: input.parsed.secrets,
      signal: input.signal,
    }
  )
  return result.stdout.trim()
}

export async function dropOwnedDisposableDatabase(input: {
  adminDatabaseUrl: string
  runner?: ProcessRunner
  targetDatabase: string
}): Promise<"absent" | "dropped"> {
  const target = assertDisposableDatabaseName(input.targetDatabase)
  const marker = disposableMarker(target)
  const parsed = parseDatabaseUrl(input.adminDatabaseUrl)
  if (parsed.identity.database === target) {
    fail("maintenance database and disposable target must be distinct")
  }
  const ownership = await queryAdmin({
    parsed,
    runner: input.runner ?? runChild,
    sql: OWNERSHIP_SQL,
    variables: { marker, target },
  })
  if (ownership === "") {
    return "absent"
  }
  if (ownership !== "owned") {
    fail(
      "refusing to drop database without the exact ownership marker and owner"
    )
  }
  await (input.runner ?? runChild)(
    "dropdb",
    ["--force", "--if-exists", "--no-password", target],
    { env: parsed.childEnv, sensitiveValues: parsed.secrets }
  )
  return "dropped"
}

export async function restoreDrill(input: {
  adminDatabaseUrl: string
  checksumFile?: string
  dump: string
  runner?: ProcessRunner
  signal?: AbortSignal
  sourceDatabase: string
  targetDatabase: string
}): Promise<{ relationCount: number; sha256: string; targetDatabase: string }> {
  const runner = input.runner ?? runChild
  const target = assertDisposableDatabaseName(input.targetDatabase)
  const parsed = parseDatabaseUrl(input.adminDatabaseUrl)
  if (!DATABASE_NAME_PATTERN.test(input.sourceDatabase)) {
    fail("source database identity is invalid")
  }
  assertPairwiseDistinct({
    maintenanceDatabase: parsed.identity.database,
    sourceDatabase: input.sourceDatabase,
    targetDatabase: target,
  })
  const dump = resolve(input.dump)
  const checksumFile = resolve(input.checksumFile ?? `${dump}.sha256`)
  assertPairwiseDistinct({ checksumFile, dump })
  const sha256 = await verifyLocalChecksum(dump, checksumFile)
  const marker = disposableMarker(target)
  const existing = await queryAdmin({
    parsed,
    runner,
    signal: input.signal,
    sql: TARGET_EXISTS_SQL,
    variables: { target },
  })
  if (existing !== "0") {
    fail("restore target already exists")
  }
  let created = false
  try {
    await runner(
      "createdb",
      [
        "--no-password",
        "--template=template0",
        "--encoding=UTF8",
        `--comment=${marker}`,
        target,
      ],
      {
        env: parsed.childEnv,
        sensitiveValues: parsed.secrets,
        signal: input.signal,
      }
    )
    created = true
    const ownership = await queryAdmin({
      parsed,
      runner,
      signal: input.signal,
      sql: OWNERSHIP_SQL,
      variables: { marker, target },
    })
    if (ownership !== "owned") {
      fail("created restore target did not retain the exact ownership marker")
    }
    await runner(
      "pg_restore",
      ["--exit-on-error", "--no-password", `--dbname=${target}`, dump],
      {
        env: databaseEnv(parsed, target),
        sensitiveValues: parsed.secrets,
        signal: input.signal,
      }
    )
    const validation = await runner(
      "psql",
      [
        "--no-psqlrc",
        "--no-password",
        "--set=ON_ERROR_STOP=1",
        "--tuples-only",
        "--no-align",
        "--field-separator=|",
        "--command=SELECT current_database(), count(*) FROM pg_catalog.pg_class WHERE relkind IN ('r','p') AND relnamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('pg_catalog','information_schema'));",
      ],
      {
        env: databaseEnv(parsed, target),
        sensitiveValues: parsed.secrets,
        signal: input.signal,
      }
    )
    const [database, countText, extra] = validation.stdout.trim().split("|")
    const relationCount = Number.parseInt(countText ?? "", 10)
    if (
      extra !== undefined ||
      database !== target ||
      !Number.isSafeInteger(relationCount) ||
      relationCount <= 0
    ) {
      fail("restored database validation query failed")
    }
    return { relationCount, sha256, targetDatabase: target }
  } finally {
    if (created) {
      await dropOwnedDisposableDatabase({
        adminDatabaseUrl: input.adminDatabaseUrl,
        runner,
        targetDatabase: target,
      })
    }
  }
}

function requireOption(
  options: Readonly<Record<string, string>>,
  name: string
): string {
  return requireNonempty(options[name], `--${name}`)
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

export async function runCli(
  argv: readonly string[],
  dependencies: {
    env?: NodeJS.ProcessEnv
    runner?: ProcessRunner
    signal?: AbortSignal
  } = {}
): Promise<void> {
  const { command, options } = parseCliArgs(argv)
  const runner = dependencies.runner ?? runChild
  const env = dependencies.env ?? process.env
  if (command === "health") {
    rejectUnknownOptions(options, [])
    printJson({ status: "ok" })
    return
  }
  if (command === "idle") {
    rejectUnknownOptions(options, [])
    printJson({ mode: "idle", status: "ready" })
    if (dependencies.signal?.aborted) {
      return
    }
    await new Promise<void>((resolvePromise) =>
      dependencies.signal?.addEventListener("abort", () => resolvePromise(), {
        once: true,
      })
    )
    return
  }
  if (command === "preflight") {
    rejectUnknownOptions(options, [
      "bucket",
      "db-url-env",
      "endpoint",
      "expected-db",
    ])
    const databaseUrl = readSecretEnv(requireOption(options, "db-url-env"), env)
    const [database, objectStore] = await Promise.all([
      preflightDatabase(
        runner,
        databaseUrl,
        requireOption(options, "expected-db"),
        dependencies.signal
      ),
      preflightPrivateTarget({
        bucket: requireOption(options, "bucket"),
        endpoint: requireOption(options, "endpoint"),
        env,
        runner,
        signal: dependencies.signal,
      }),
    ])
    printJson({ database, objectStore, status: "ready" })
    return
  }
  if (command === "backup") {
    rejectUnknownOptions(options, ["db-url-env", "expected-db", "output"])
    const result = await createBackup({
      databaseUrl: readSecretEnv(requireOption(options, "db-url-env"), env),
      expectedDatabase: requireOption(options, "expected-db"),
      output: requireOption(options, "output"),
      runner,
      signal: dependencies.signal,
    })
    printJson({ ...result, status: "created" })
    return
  }
  if (command === "upload") {
    rejectUnknownOptions(options, [
      "bucket",
      "checksum",
      "endpoint",
      "input",
      "object-key",
    ])
    const result = await uploadBackup({
      bucket: requireOption(options, "bucket"),
      checksumFile: options.checksum,
      endpoint: requireOption(options, "endpoint"),
      env,
      file: requireOption(options, "input"),
      objectKey: requireOption(options, "object-key"),
      runner,
      signal: dependencies.signal,
    })
    printJson({ ...result, status: "uploaded" })
    return
  }
  if (command === "download") {
    rejectUnknownOptions(options, [
      "bucket",
      "checksum",
      "endpoint",
      "object-key",
      "output",
    ])
    const result = await downloadBackup({
      bucket: requireOption(options, "bucket"),
      checksumFile: options.checksum,
      endpoint: requireOption(options, "endpoint"),
      env,
      objectKey: requireOption(options, "object-key"),
      output: requireOption(options, "output"),
      runner,
      signal: dependencies.signal,
    })
    printJson({ ...result, status: "downloaded-and-verified" })
    return
  }
  if (command === "verify-roundtrip") {
    rejectUnknownOptions(options, ["bucket", "endpoint", "input", "object-key"])
    const result = await verifyRoundtrip({
      bucket: requireOption(options, "bucket"),
      endpoint: requireOption(options, "endpoint"),
      env,
      file: requireOption(options, "input"),
      objectKey: requireOption(options, "object-key"),
      runner,
      signal: dependencies.signal,
    })
    printJson({ ...result, status: "roundtrip-verified" })
    return
  }
  if (command === "restore-drill") {
    rejectUnknownOptions(options, [
      "admin-db-url-env",
      "checksum",
      "dump",
      "source-db",
      "target-db",
    ])
    const result = await restoreDrill({
      adminDatabaseUrl: readSecretEnv(
        requireOption(options, "admin-db-url-env"),
        env
      ),
      checksumFile: options.checksum,
      dump: requireOption(options, "dump"),
      runner,
      signal: dependencies.signal,
      sourceDatabase: requireOption(options, "source-db"),
      targetDatabase: requireOption(options, "target-db"),
    })
    printJson({ ...result, status: "restored-validated-and-dropped" })
    return
  }
  fail(`unknown subcommand: ${command}`)
}

export async function main(
  argv: readonly string[] = process.argv.slice(2)
): Promise<void> {
  const abortController = new AbortController()
  let signalExitCode: number | undefined
  const abortForSignal = (exitCode: number) => {
    signalExitCode = exitCode
    abortController.abort()
  }
  const onSigint = () => abortForSignal(130)
  const onSigterm = () => abortForSignal(143)
  process.once("SIGINT", onSigint)
  process.once("SIGTERM", onSigterm)
  try {
    await runCli(argv, { signal: abortController.signal })
    if (signalExitCode !== undefined) {
      process.exitCode = signalExitCode
    }
  } catch (error) {
    process.stderr.write(
      `${redact(error instanceof Error ? error.message : String(error))}\n`
    )
    process.exitCode = signalExitCode ?? 1
  } finally {
    process.removeListener("SIGINT", onSigint)
    process.removeListener("SIGTERM", onSigterm)
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : ""
if (import.meta.url === invokedPath) {
  await main()
}
