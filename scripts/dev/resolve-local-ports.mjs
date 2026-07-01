#!/usr/bin/env node
import { execFile } from "node:child_process"
import { createSocket } from "node:dgram"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { dirname, resolve } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const endpoints = [
  ["medusa-be", "DC_MEDUSA_BE_PUBLIC_PORT", 9000],
  ["medusa-be-admin", "DC_MEDUSA_BE_ADMIN_PUBLIC_PORT", 9009],
  ["medusa-be-hmr", "DC_MEDUSA_BE_HMR_PUBLIC_PORT", 24_678],
  ["n1", "DC_N1_PUBLIC_PORT", 8000],
  ["valkey", "DC_VALKEY_PUBLIC_PORT", 6379],
  ["minio-console", "DC_MINIO_CONSOLE_PUBLIC_PORT", 9003],
  ["minio-api", "DC_MINIO_API_PUBLIC_PORT", 9004],
  ["meilisearch", "DC_MEILISEARCH_PUBLIC_PORT", 7700],
  ["postgres", "DC_POSTGRES_PUBLIC_PORT", 5433],
  ["zane-operator", "DC_ZANE_OPERATOR_PUBLIC_PORT", 8082],
  ["engine-db", "DC_ENGINE_DB_PUBLIC_PORT", 3306],
  ["adminer", "DC_ADMINER_PUBLIC_PORT", 8081],
  ["caddy-http", "DC_CADDY_HTTP_PUBLIC_PORT", 80],
  ["caddy-https", "DC_CADDY_HTTPS_PUBLIC_PORT", 443, ["tcp", "udp"]],
].map(([id, envVar, preferredPort, protocols = ["tcp"]]) => ({
  id,
  envVar,
  preferredPort,
  protocols,
  host: "127.0.0.1",
}))

const defaultDerivedEnv = {
  DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://localhost:9000",
  DC_N1_NEXT_PUBLIC_MEILISEARCH_URL: "http://localhost:7700",
  DC_N1_NEXT_PUBLIC_SITE_URL: "http://localhost:8000",
  DC_STORE_CORS:
    "http://localhost:8000,http://localhost:8080,https://n1.medusa.localhost,http://localhost:9004,https://docs.medusajs.com",
  DC_ADMIN_CORS:
    "http://localhost:5173,https://admin.medusa.localhost,http://localhost:9000,https://docs.medusajs.com",
  DC_AUTH_CORS:
    "http://localhost:5173,https://admin.medusa.localhost,http://localhost:9000,https://docs.medusajs.com",
  MISE_DEV_MEILI_URL: "http://127.0.0.1:7700",
}

const lineBreakPattern = /\r?\n/
const envLinePattern = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/
const integerPattern = /^\d+$/
const dockerPublishedPortPattern =
  /(?:^|,\s)[^,]*:(\d+)(?:-(\d+))?->\d+(?:-\d+)?\/(tcp|udp)/g
const bareShellEnvValuePattern = /^[A-Za-z0-9_./:@,+%-]*$/
const bindProbeResult = {
  available: "available",
  unavailable: "unavailable",
  unknown: "unknown",
}
const argOptionMap = {
  "--env-file": "envFile",
  "--output": "output",
  "--project-name": "projectName",
}

function parseArgs(argv) {
  const args = {
    envFile: ".env",
    output: ".docker_data/dev-runtime.env",
    projectName: "new-engine",
    json: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "-h" || arg === "--help") {
      printUsage()
      process.exit(0)
    }

    if (arg === "--json") {
      args.json = true
      continue
    }

    const optionKey = argOptionMap[arg]
    if (!optionKey) {
      throw new Error(`Unknown argument: ${arg}`)
    }

    index += 1
    args[optionKey] = requireValue(argv, index, arg)
  }

  return args
}

function requireValue(argv, index, arg) {
  const value = argv[index]
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value.`)
  }
  return value
}

function printUsage() {
  process.stdout.write(`Usage: scripts/dev/resolve-local-ports.mjs [options]

Options:
  --env-file <path>       Local .env file (default: .env)
  --output <path>         Generated runtime env file (default: .docker_data/dev-runtime.env)
  --project-name <name>   Docker Compose project name (default: new-engine)
  --json                  Print JSON response
`)
}

async function readOptionalFile(path) {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if (error?.code === "ENOENT") {
      return ""
    }
    throw error
  }
}

function stripEnvQuotes(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseEnv(raw) {
  const env = {}
  for (const line of raw.split(lineBreakPattern)) {
    const match = line.match(envLinePattern)
    if (match) {
      env[match[1]] = stripEnvQuotes(match[2])
    }
  }
  return env
}

function preferredPortFor(endpoint, envFile, runtimeEnvFile) {
  const sources = [
    ["process", process.env[endpoint.envVar]],
    ["env_file", envFile[endpoint.envVar]],
    ["runtime_env_file", runtimeEnvFile[endpoint.envVar]],
    ["config", String(endpoint.preferredPort)],
  ]

  for (const [source, value] of sources) {
    if (value) {
      return { source, port: parsePort(value, endpoint.envVar) }
    }
  }

  throw new Error(`No preferred port found for ${endpoint.envVar}.`)
}

function parsePort(value, envVar) {
  if (!integerPattern.test(value)) {
    throw new Error(
      `${envVar} must be an integer TCP/UDP port, got "${value}".`
    )
  }

  const port = Number.parseInt(value, 10)
  if (port < 1 || port > 65_535) {
    throw new Error(`${envVar} must be between 1 and 65535, got "${value}".`)
  }
  return port
}

function* candidatePorts(preferredPort) {
  for (let port = preferredPort; port <= 65_535; port += 1) {
    yield port
  }

  for (let port = 1; port < preferredPort; port += 1) {
    yield port
  }
}

async function canBindTcp(host, port) {
  return await new Promise((resolveProbe) => {
    const server = createServer()
    server.once("error", (error) => {
      if (error?.code === "EACCES" && port < 1024) {
        resolveProbe(bindProbeResult.unknown)
        return
      }
      resolveProbe(bindProbeResult.unavailable)
    })
    server.once("listening", () => {
      server.close(() => resolveProbe(bindProbeResult.available))
    })
    server.listen({ host, port })
  })
}

async function canBindUdp(host, port) {
  return await new Promise((resolveProbe) => {
    const socket = createSocket("udp4")
    socket.once("error", (error) => {
      socket.close()
      resolveProbe(
        error?.code === "EACCES" && port < 1024
          ? bindProbeResult.unknown
          : bindProbeResult.unavailable
      )
    })
    socket.once("listening", () => {
      socket.close()
      resolveProbe(bindProbeResult.available)
    })
    socket.bind(port, host)
  })
}

async function isEndpointPortAvailable(
  endpoint,
  port,
  dockerPorts,
  projectPorts
) {
  for (const protocol of endpoint.protocols) {
    const key = `${protocol}:${port}`
    const canBind = protocol === "udp" ? canBindUdp : canBindTcp
    if (projectPorts.owners.get(key) === endpoint.id) {
      continue
    }
    if (
      dockerPorts.has(key) ||
      projectPorts.ports.has(key) ||
      (await canBind(endpoint.host, port)) !== bindProbeResult.available
    ) {
      return false
    }
  }
  return true
}

async function resolveEndpointPort({
  endpoint,
  preferredPort,
  source,
  dockerPorts,
  projectPorts,
  allocatedPorts,
}) {
  for (const candidate of candidatePorts(preferredPort)) {
    if (allocatedPorts.has(candidate)) {
      continue
    }
    if (
      !(await isEndpointPortAvailable(
        endpoint,
        candidate,
        dockerPorts,
        projectPorts
      ))
    ) {
      continue
    }

    allocatedPorts.add(candidate)
    return {
      id: endpoint.id,
      env_var: endpoint.envVar,
      host: endpoint.host,
      preferred_port: preferredPort,
      resolved_port: candidate,
      source,
      shifted: candidate !== preferredPort,
      protocols: endpoint.protocols,
    }
  }

  throw new Error(`No free host port found for ${endpoint.envVar}.`)
}

function parseDockerPublishedPorts(output) {
  const ports = new Set()
  for (const line of output.split(lineBreakPattern)) {
    dockerPublishedPortPattern.lastIndex = 0
    for (const match of line.matchAll(dockerPublishedPortPattern)) {
      const start = Number.parseInt(match[1], 10)
      const end = match[2] ? Number.parseInt(match[2], 10) : start
      for (let port = start; port <= end; port += 1) {
        ports.add(`${match[3]}:${port}`)
      }
    }
  }
  return ports
}

async function getDockerPublishedPorts(args = []) {
  try {
    const result = await execFileAsync("docker", [
      "ps",
      ...args,
      "--format",
      "{{.Ports}}",
    ])
    return parseDockerPublishedPorts(result.stdout)
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    const filterDescription = args.length > 0 ? ` ${args.join(" ")}` : ""
    process.stderr.write(
      `Warning: docker ps${filterDescription} failed while resolving local ports: ${details}\n`
    )
    return new Set()
  }
}

function projectPortOwners(projectPorts, runtimeEnvFile) {
  const owners = new Map()

  for (const endpoint of endpoints) {
    const value = runtimeEnvFile[endpoint.envVar]
    if (!value) {
      continue
    }

    const port = parsePort(value, endpoint.envVar)
    for (const protocol of endpoint.protocols) {
      const key = `${protocol}:${port}`
      if (projectPorts.has(key)) {
        owners.set(key, endpoint.id)
      }
    }
  }

  return owners
}

function caddyHttpsOrigin(host, port) {
  return port === "443" ? `https://${host}` : `https://${host}:${port}`
}

function derivedEnvValues(env) {
  const caddyHttpsPort = env.DC_CADDY_HTTPS_PUBLIC_PORT
  return {
    DC_N1_NEXT_PUBLIC_MEDUSA_BACKEND_URL: `http://localhost:${env.DC_MEDUSA_BE_PUBLIC_PORT}`,
    DC_N1_NEXT_PUBLIC_MEILISEARCH_URL: `http://localhost:${env.DC_MEILISEARCH_PUBLIC_PORT}`,
    DC_N1_NEXT_PUBLIC_SITE_URL: `http://localhost:${env.DC_N1_PUBLIC_PORT}`,
    DC_STORE_CORS: [
      `http://localhost:${env.DC_N1_PUBLIC_PORT}`,
      "http://localhost:8080",
      caddyHttpsOrigin("n1.medusa.localhost", caddyHttpsPort),
      `http://localhost:${env.DC_MINIO_API_PUBLIC_PORT}`,
      "https://docs.medusajs.com",
    ].join(","),
    DC_ADMIN_CORS: [
      "http://localhost:5173",
      caddyHttpsOrigin("admin.medusa.localhost", caddyHttpsPort),
      `http://localhost:${env.DC_MEDUSA_BE_PUBLIC_PORT}`,
      "https://docs.medusajs.com",
    ].join(","),
    DC_AUTH_CORS: [
      "http://localhost:5173",
      caddyHttpsOrigin("admin.medusa.localhost", caddyHttpsPort),
      `http://localhost:${env.DC_MEDUSA_BE_PUBLIC_PORT}`,
      "https://docs.medusajs.com",
    ].join(","),
    MISE_DEV_MEILI_URL: `http://127.0.0.1:${env.DC_MEILISEARCH_PUBLIC_PORT}`,
  }
}

function shouldRenderDerivedEnv(envVar, envFile) {
  if (process.env[envVar]) {
    return false
  }

  const currentValue = envFile[envVar]
  if (!currentValue) {
    return true
  }

  return currentValue === defaultDerivedEnv[envVar]
}

function quoteShellEnvValue(value) {
  if (bareShellEnvValuePattern.test(value)) {
    return value
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function renderRuntimeEnvFile({ ports, renderedDerivedEnv, env }) {
  const lines = [
    "# Generated by scripts/dev/resolve-local-ports.mjs.",
    "# Do not edit manually; change .env or the resolver defaults instead.",
    "",
    "# Host-published Docker Compose ports.",
  ]

  for (const port of ports) {
    lines.push(`# ${port.id}: ${port.host}:${port.resolved_port}`)
    lines.push(`${port.env_var}=${port.resolved_port}`)
  }

  if (renderedDerivedEnv.length > 0) {
    lines.push(
      "",
      "# Host-facing local runtime URLs derived from resolved ports."
    )
    for (const envVar of renderedDerivedEnv) {
      lines.push(`${envVar}=${quoteShellEnvValue(env[envVar])}`)
    }
  }

  lines.push("")
  return `${lines.join("\n")}\n`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const envFilePath = resolve(args.envFile)
  const outputPath = resolve(args.output)
  const [envRaw, runtimeEnvRaw, dockerPorts, projectPorts] = await Promise.all([
    readOptionalFile(envFilePath),
    readOptionalFile(outputPath),
    getDockerPublishedPorts(),
    getDockerPublishedPorts([
      "--filter",
      `label=com.docker.compose.project=${args.projectName}`,
    ]),
  ])
  const envFile = parseEnv(envRaw)
  const runtimeEnvFile = parseEnv(runtimeEnvRaw)
  const projectPortState = {
    ports: projectPorts,
    owners: projectPortOwners(projectPorts, runtimeEnvFile),
  }
  const allocatedPorts = new Set()
  const ports = []
  const env = {}

  for (const endpoint of endpoints) {
    const preferred = preferredPortFor(endpoint, envFile, runtimeEnvFile)
    const resolved = await resolveEndpointPort({
      endpoint,
      preferredPort: preferred.port,
      source: preferred.source,
      dockerPorts,
      projectPorts: projectPortState,
      allocatedPorts,
    })
    ports.push(resolved)
    env[resolved.env_var] = String(resolved.resolved_port)
  }

  const renderedDerivedEnv = []
  const nextDerivedEnv = derivedEnvValues({
    ...envFile,
    ...runtimeEnvFile,
    ...env,
  })
  for (const [envVar, value] of Object.entries(nextDerivedEnv)) {
    if (shouldRenderDerivedEnv(envVar, envFile)) {
      env[envVar] = value
      renderedDerivedEnv.push(envVar)
    }
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(
    outputPath,
    renderRuntimeEnvFile({ ports, renderedDerivedEnv, env }),
    "utf8"
  )

  const result = {
    env_file_path: envFilePath,
    output_path: outputPath,
    project_name: args.projectName,
    ports,
    env,
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return
  }

  for (const port of ports) {
    const suffix = port.shifted ? ` (shifted from ${port.preferred_port})` : ""
    process.stdout.write(`${port.env_var}=${port.resolved_port}${suffix}\n`)
  }
  process.stdout.write(`Wrote ${outputPath}\n`)
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exit(1)
})
