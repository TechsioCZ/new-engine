#!/usr/bin/env node

import { spawn } from "node:child_process"
import net from "node:net"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
)
const medusaBeDir = path.join(repoRoot, "apps/medusa-be")

const dbEnv = {
  DB_HOST: process.env.DB_HOST || "127.0.0.1",
  DB_USERNAME: process.env.DB_USERNAME || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "root",
  DB_PORT: process.env.DB_PORT || "5432",
  DB_TEMP_NAME: process.env.DB_TEMP_NAME || "medusa_test",
}

const dbUser = encodeURIComponent(dbEnv.DB_USERNAME)
const dbPassword = encodeURIComponent(dbEnv.DB_PASSWORD)
const dbName = encodeURIComponent(dbEnv.DB_TEMP_NAME)
dbEnv.DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgres://${dbUser}:${dbPassword}@${dbEnv.DB_HOST}:${dbEnv.DB_PORT}/${dbName}`

const nodeOptions = [process.env.NODE_OPTIONS, "--experimental-vm-modules"]
  .filter(Boolean)
  .join(" ")

const testEnv = {
  ...process.env,
  ...dbEnv,
  TEST_TYPE: "integration:modules",
  NODE_OPTIONS: nodeOptions,
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      stdio: options.stdio || "inherit",
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (options.allowFailure) {
        resolve(code ?? 1)
        return
      }

      if (code === 0) {
        resolve(0)
        return
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))
    })
  })
}

function canConnect(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end()
      resolve(true)
    })

    socket.on("error", () => resolve(false))
    socket.setTimeout(timeoutMs, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function waitForTcp(host, port, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await canConnect(host, port)) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return false
}

async function waitForDockerPostgres(containerName, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
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
      { allowFailure: true, stdio: "ignore" }
    )

    if (code === 0) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return false
}

function dockerContainerName() {
  const raw = [
    "new-engine-medusa-module-test-pg",
    process.env.GITHUB_RUN_ID || "local",
    process.env.GITHUB_RUN_ATTEMPT || process.pid,
  ].join("-")

  return raw.replace(/[^a-zA-Z0-9_.-]/g, "-")
}

async function ensureGithubPostgres() {
  if (process.env.GITHUB_ACTIONS !== "true") {
    return null
  }

  const port = Number(dbEnv.DB_PORT)
  if (await waitForTcp(dbEnv.DB_HOST, port, 30)) {
    return null
  }

  const name = dockerContainerName()
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
    `${dbEnv.DB_HOST}:${dbEnv.DB_PORT}:5432`,
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
      `Postgres did not become ready on ${dbEnv.DB_HOST}:${dbEnv.DB_PORT}`
    )
  }

  return name
}

let postgresContainer = null

try {
  postgresContainer = await ensureGithubPostgres()
  const exitCode = await run(
    "pnpm",
    ["exec", "jest", "--silent", "--runInBand", "--forceExit"],
    {
      cwd: medusaBeDir,
      env: testEnv,
      allowFailure: true,
    }
  )

  process.exitCode = exitCode
} finally {
  if (postgresContainer) {
    await run("docker", ["rm", "-f", postgresContainer], {
      allowFailure: true,
      stdio: "ignore",
    })
  }
}
