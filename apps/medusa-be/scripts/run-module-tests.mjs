#!/usr/bin/env node
/// <reference types="node" />

import { spawn } from "node:child_process"
import { once } from "node:events"
import net from "node:net"
import path from "node:path"
import process from "node:process"
import { setTimeout as delay } from "node:timers/promises"

import { medusaBeDir, repoRoot } from "./hash-safe-workdir.mjs"

const dbEnv = {
  DB_HOST: process.env.DB_HOST ?? "127.0.0.1",
  DB_PASSWORD: process.env.DB_PASSWORD ?? "root",
  DB_PORT: process.env.DB_PORT ?? "5432",
  DB_TEMP_NAME: process.env.DB_TEMP_NAME ?? "medusa_test",
  DB_USERNAME: process.env.DB_USERNAME ?? "root",
}

const dbUser = encodeURIComponent(dbEnv.DB_USERNAME)
const dbPassword = encodeURIComponent(dbEnv.DB_PASSWORD)
const dbName = encodeURIComponent(dbEnv.DB_TEMP_NAME)
dbEnv.DATABASE_URL =
  process.env.DATABASE_URL ??
  `postgres://${dbUser}:${dbPassword}@${dbEnv.DB_HOST}:${dbEnv.DB_PORT}/${dbName}`

const nodeOptions = [
  process.env.NODE_OPTIONS,
  "-r",
  "ts-node/register/transpile-only",
]
  .filter(Boolean)
  .join(" ")

const testEnv = {
  ...process.env,
  ...dbEnv,
  NODE_OPTIONS: nodeOptions,
  TEST_TYPE: "integration:modules",
  TS_NODE_PROJECT: path.join(medusaBeDir, "tsconfig.json"),
  TS_NODE_TRANSPILE_ONLY: "true",
}

/**
 * @typedef {object} RunOptions
 * @property {string} [cwd] - Working directory for the spawned process.
 * @property {NodeJS.ProcessEnv} [env] - Environment variables for the process.
 * @property {"inherit" | "ignore"} [stdio] - Stdio mode for the process.
 * @property {boolean} [allowFailure] - Whether a non-zero exit code should
 *   resolve instead of throw.
 */

/**
 * Spawns a command and waits for it to exit.
 * @param {string} command - Executable to run.
 * @param {readonly string[]} args - Arguments passed to the command.
 * @param {RunOptions} [options] - Spawn and failure-handling options.
 * @returns {Promise<number>} Resolves with the process exit code (or `1`
 *   when the exit code is unknown and `allowFailure` is set).
 */
const run = async (command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
  })

  /** @type {readonly unknown[]} */
  const exitArgs = await once(child, "exit")
  const [rawCode] = exitArgs
  const code = typeof rawCode === "number" ? rawCode : null

  if (options.allowFailure === true) {
    return code ?? 1
  }

  if (code === 0) {
    return 0
  }

  throw new Error(`${command} ${args.join(" ")} exited with code ${code}`)
}

/**
 * Checks whether a TCP connection can be established before a timeout.
 * @param {string} host - Target host.
 * @param {number} port - Target port.
 * @param {number} [timeoutMs] - Connection timeout in milliseconds.
 * @returns {Promise<boolean>} `true` when the socket connected successfully.
 */
const canConnect = async (host, port, timeoutMs = 1000) => {
  const socket = net.connect({ host, port })
  socket.setTimeout(timeoutMs)

  const waitForConnect = async () => {
    await once(socket, "connect")
    return "connect"
  }

  const waitForSocketTimeout = async () => {
    await once(socket, "timeout")
    return "timeout"
  }

  let outcome
  try {
    outcome = await Promise.race([waitForConnect(), waitForSocketTimeout()])
  } catch {
    outcome = "error"
  }

  if (outcome === "connect") {
    socket.end()
    return true
  }

  if (outcome === "timeout") {
    socket.destroy()
  }

  return false
}

/**
 * Waits for a fixed duration.
 * @param {number} ms - Duration to wait, in milliseconds.
 * @returns {Promise<void>} Resolves once the duration has elapsed.
 */
const sleep = async (ms) => {
  await delay(ms)
}

/**
 * Polls a check function until it succeeds or the attempt budget runs out.
 * @param {number} attempts - Remaining attempts, decremented each recursion.
 * @param {() => Promise<boolean>} check - Async predicate to poll.
 * @returns {Promise<boolean>} `true` once `check` succeeds, else `false`.
 */
const waitUntil = async (attempts, check) => {
  if (attempts <= 0) {
    return false
  }

  if (await check()) {
    return true
  }

  await sleep(1000)
  return await waitUntil(attempts - 1, check)
}

/**
 * Waits for a TCP port to accept connections.
 * @param {string} host - Target host.
 * @param {number} port - Target port.
 * @param {number} [attempts] - Number of polling attempts.
 * @returns {Promise<boolean>} `true` once the port accepts connections.
 */
const waitForTcp = async (host, port, attempts = 30) =>
  await waitUntil(attempts, async () => await canConnect(host, port))

/**
 * Waits for a Dockerized Postgres container to report readiness.
 * @param {string} containerName - Name of the running Postgres container.
 * @param {number} [attempts] - Number of polling attempts.
 * @returns {Promise<boolean>} `true` once `pg_isready` succeeds.
 */
const waitForDockerPostgres = async (containerName, attempts = 60) =>
  await waitUntil(attempts, async () => {
    const code = await run(
      "docker",
      [
        "exec",
        "-e",
        `PGPASSWORD=${dbEnv.DB_PASSWORD}`,
        containerName,
        "pg_isready",
        "-U",
        dbEnv.DB_USERNAME,
        "-d",
        dbEnv.DB_TEMP_NAME,
      ],
      { allowFailure: true, stdio: "ignore" },
    )

    return code === 0
  })

/**
 * Checks whether the Docker daemon is reachable.
 * @returns {Promise<boolean>} `true` when `docker version` succeeds.
 */
const canRunDocker = async () => {
  const code = await run(
    "docker",
    ["version", "--format", "{{.Server.Version}}"],
    {
      allowFailure: true,
      stdio: "ignore",
    },
  )

  return code === 0
}

/**
 * Checks whether the configured DB host is local enough to bind a
 * disposable Docker Postgres container to it.
 * @returns {boolean} `true` when `DB_HOST` is a loopback address.
 */
const canBindDockerPostgres = () =>
  dbEnv.DB_HOST === "127.0.0.1" || dbEnv.DB_HOST === "localhost"

/**
 * Builds a unique, filesystem/CLI-safe name for the disposable Postgres
 * container.
 * @returns {string} Sanitized container name.
 */
const dockerContainerName = () => {
  const raw = [
    "new-engine-medusa-module-test-pg",
    process.env.GITHUB_RUN_ID ?? "local",
    process.env.GITHUB_RUN_ATTEMPT ?? process.pid,
  ].join("-")

  return raw.replaceAll(/[^a-zA-Z0-9_.-]/gu, "-")
}

/**
 * Ensures Postgres is reachable, starting a disposable Docker container
 * when no server is already listening.
 * @returns {Promise<string | null>} The started container's name, or
 *   `null` when an existing Postgres server was used instead.
 */
const ensurePostgres = async () => {
  const port = Number(dbEnv.DB_PORT)
  if (await waitForTcp(dbEnv.DB_HOST, port, 30)) {
    return null
  }

  if (!(canBindDockerPostgres() && (await canRunDocker()))) {
    return null
  }

  const name = dockerContainerName()
  const dockerBindHost =
    dbEnv.DB_HOST === "localhost" ? "127.0.0.1" : dbEnv.DB_HOST

  await run("docker", ["rm", "-f", name], {
    allowFailure: true,
    stdio: "ignore",
  })
  await run("docker", [
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "-e",
    `POSTGRES_USER=${dbEnv.DB_USERNAME}`,
    "-e",
    `POSTGRES_PASSWORD=${dbEnv.DB_PASSWORD}`,
    "-e",
    `POSTGRES_DB=${dbEnv.DB_TEMP_NAME}`,
    "-p",
    `${dockerBindHost}:${dbEnv.DB_PORT}:5432`,
    "postgres:18.1-alpine",
  ])

  if (
    !(
      (await waitForTcp(dbEnv.DB_HOST, port, 30)) &&
      (await waitForDockerPostgres(name, 60))
    )
  ) {
    await run("docker", ["logs", name], { allowFailure: true })
    throw new Error(
      `Postgres did not become ready on ${dbEnv.DB_HOST}:${dbEnv.DB_PORT}`,
    )
  }

  return name
}

/** @type {string | null} */
let postgresContainer = null

try {
  postgresContainer = await ensurePostgres()
  const exitCode = await run(
    process.execPath,
    [
      "./scripts/run-vitest.mjs",
      "run",
      "--config",
      "vitest.config.ts",
      "--no-file-parallelism",
    ],
    {
      allowFailure: true,
      cwd: medusaBeDir,
      env: testEnv,
    },
  )

  process.exitCode = exitCode
} finally {
  if (postgresContainer !== null) {
    await run("docker", ["rm", "-f", postgresContainer], {
      allowFailure: true,
      stdio: "ignore",
    })
  }
}
