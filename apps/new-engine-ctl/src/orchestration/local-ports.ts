import { execFile } from "node:child_process"
import { createSocket } from "node:dgram"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { dirname, resolve } from "node:path"
import { promisify } from "node:util"

import { parse as parseYaml } from "yaml"

import {
  type LocalDerivedEnv,
  type LocalPortEndpoint,
  type LocalPortProtocol,
  type LocalPortsConfig,
  type LocalPortsResolveCommandInput,
  localPortsConfigSchema,
  localPortsResolveResponseSchema,
} from "../contracts/local-ports.js"
import { repoRoot } from "../paths.js"

const execFileAsync = promisify(execFile)
const lineBreakPattern = /\r?\n/
const envLinePattern = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/
const integerPattern = /^\d+$/
const dockerPublishedPortPattern =
  /(?:^|,\s)[^,]*:(\d+)(?:-(\d+))?->\d+(?:-\d+)?\/(tcp|udp)/g
const templateVariablePattern = /\$\{([A-Z][A-Z0-9_]*)\}/g
const bareShellEnvValuePattern = /^[A-Za-z0-9_./:@,+%-]*$/

type EnvSource = "process" | "env_file" | "runtime_env_file" | "config"

type EnvValue = {
  value: string
  source: EnvSource
}

type ResolvedPort = {
  id: string
  env_var: string
  host: string
  preferred_port: number
  resolved_port: number
  source: EnvSource
  shifted: boolean
  protocols: LocalPortProtocol[]
}

async function readOptionalFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return ""
    }
    throw error
  }
}

function stripEnvQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function parseEnv(raw: string): Record<string, string> {
  const env: Record<string, string> = {}

  for (const line of raw.split(lineBreakPattern)) {
    const match = line.match(envLinePattern)
    if (!match) {
      continue
    }

    const [, name, value] = match
    if (name === undefined || value === undefined) {
      continue
    }

    env[name] = stripEnvQuotes(value)
  }

  return env
}

async function loadConfig(path: string): Promise<LocalPortsConfig> {
  const raw = await readFile(path, "utf8")
  let parsed: unknown

  try {
    parsed = parseYaml(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse YAML at ${path}: ${message}`)
  }

  return localPortsConfigSchema.parse(parsed)
}

function parsePort(value: string, envVar: string): number {
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

function resolvePreferredPort(input: {
  endpoint: LocalPortEndpoint
  envFile: Record<string, string>
  runtimeEnvFile: Record<string, string>
}): EnvValue {
  const { endpoint, envFile, runtimeEnvFile } = input
  const processValue = process.env[endpoint.env_var]
  if (processValue) {
    return { value: processValue, source: "process" }
  }

  const envFileValue = envFile[endpoint.env_var]
  if (envFileValue) {
    return { value: envFileValue, source: "env_file" }
  }

  const runtimeValue = runtimeEnvFile[endpoint.env_var]
  if (runtimeValue) {
    return { value: runtimeValue, source: "runtime_env_file" }
  }

  return { value: String(endpoint.preferred_port), source: "config" }
}

async function canBindTcp(host: string, port: number): Promise<boolean> {
  return await new Promise((resolveProbe) => {
    const server = createServer()

    server.once("error", () => {
      resolveProbe(false)
    })
    server.once("listening", () => {
      server.close(() => resolveProbe(true))
    })
    server.listen({ host, port })
  })
}

async function canBindUdp(host: string, port: number): Promise<boolean> {
  return await new Promise((resolveProbe) => {
    const socket = createSocket("udp4")

    socket.once("error", () => {
      socket.close()
      resolveProbe(false)
    })
    socket.once("listening", () => {
      socket.close()
      resolveProbe(true)
    })
    socket.bind(port, host)
  })
}

async function isProtocolAvailable(input: {
  host: string
  port: number
  protocol: LocalPortProtocol
  dockerPorts: Set<string>
  projectPorts: Set<string>
}): Promise<boolean> {
  const projectKey = `${input.protocol}:${input.port}`
  if (input.projectPorts.has(projectKey)) {
    return true
  }
  if (input.dockerPorts.has(projectKey)) {
    return false
  }

  if (input.protocol === "udp") {
    return await canBindUdp(input.host, input.port)
  }

  return await canBindTcp(input.host, input.port)
}

async function isEndpointPortAvailable(input: {
  endpoint: LocalPortEndpoint
  port: number
  dockerPorts: Set<string>
  projectPorts: Set<string>
}): Promise<boolean> {
  for (const protocol of input.endpoint.protocols) {
    const available = await isProtocolAvailable({
      host: input.endpoint.host,
      port: input.port,
      protocol,
      dockerPorts: input.dockerPorts,
      projectPorts: input.projectPorts,
    })
    if (!available) {
      return false
    }
  }

  return true
}

function* candidatePorts(preferredPort: number): Generator<number> {
  for (let port = preferredPort; port <= 65_535; port += 1) {
    yield port
  }

  for (let port = 1; port < preferredPort; port += 1) {
    yield port
  }
}

async function resolveEndpointPort(input: {
  endpoint: LocalPortEndpoint
  preferredPort: number
  source: EnvSource
  dockerPorts: Set<string>
  projectPorts: Set<string>
  allocatedPorts: Set<number>
}): Promise<ResolvedPort> {
  for (const candidate of candidatePorts(input.preferredPort)) {
    if (input.allocatedPorts.has(candidate)) {
      continue
    }

    const available = await isEndpointPortAvailable({
      endpoint: input.endpoint,
      port: candidate,
      dockerPorts: input.dockerPorts,
      projectPorts: input.projectPorts,
    })

    if (!available) {
      continue
    }

    input.allocatedPorts.add(candidate)

    return {
      id: input.endpoint.id,
      env_var: input.endpoint.env_var,
      host: input.endpoint.host,
      preferred_port: input.preferredPort,
      resolved_port: candidate,
      source: input.source,
      shifted: candidate !== input.preferredPort,
      protocols: input.endpoint.protocols,
    }
  }

  throw new Error(`No free host port found for ${input.endpoint.env_var}.`)
}

function parseDockerPublishedPorts(output: string): Set<string> {
  const ports = new Set<string>()

  for (const line of output.split(lineBreakPattern)) {
    dockerPublishedPortPattern.lastIndex = 0
    for (const match of line.matchAll(dockerPublishedPortPattern)) {
      const [, startValue, endValue, protocol] = match
      if (startValue === undefined || protocol === undefined) {
        continue
      }

      const start = Number.parseInt(startValue, 10)
      const end = endValue ? Number.parseInt(endValue, 10) : start
      for (let port = start; port <= end; port += 1) {
        ports.add(`${protocol}:${port}`)
      }
    }
  }

  return ports
}

async function getDockerPublishedPorts(): Promise<Set<string>> {
  try {
    const result = await execFileAsync("docker", [
      "ps",
      "--format",
      "{{.Ports}}",
    ])
    return parseDockerPublishedPorts(result.stdout)
  } catch {
    return new Set<string>()
  }
}

async function getProjectPublishedPorts(
  projectName: string
): Promise<Set<string>> {
  try {
    const result = await execFileAsync("docker", [
      "ps",
      "--filter",
      `label=com.docker.compose.project=${projectName}`,
      "--format",
      "{{.Ports}}",
    ])
    return parseDockerPublishedPorts(result.stdout)
  } catch {
    return new Set<string>()
  }
}

function shouldRenderDerivedEnv(input: {
  definition: LocalDerivedEnv
  envFile: Record<string, string>
  runtimeEnvFile: Record<string, string>
}): boolean {
  if (process.env[input.definition.env_var]) {
    return false
  }

  const currentValue = input.envFile[input.definition.env_var]
  if (!currentValue) {
    return true
  }

  if (input.runtimeEnvFile[input.definition.env_var] === currentValue) {
    return true
  }

  return input.definition.replace_when_current.includes(currentValue)
}

function renderTemplate(template: string, env: Record<string, string>): string {
  return template.replace(templateVariablePattern, (_match, name) => {
    const value = env[name]
    if (value === undefined) {
      throw new Error(`Cannot render local dev env template; ${name} is unset.`)
    }

    return value
  })
}

function quoteShellEnvValue(value: string): string {
  if (bareShellEnvValuePattern.test(value)) {
    return value
  }

  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function renderRuntimeEnvFile(input: {
  ports: ResolvedPort[]
  derivedEnv: LocalDerivedEnv[]
  env: Record<string, string>
}): string {
  const lines: string[] = [
    "# Generated by `new-engine-ctl local-ports resolve`.",
    "# Do not edit manually; change .env or apps/new-engine-ctl/config/local-ports.yaml instead.",
    "",
    "# Host-published Docker Compose ports.",
  ]

  for (const port of input.ports) {
    lines.push(`# ${port.id}: ${port.host}:${port.resolved_port}`)
    lines.push(`${port.env_var}=${port.resolved_port}`)
  }

  if (input.derivedEnv.length > 0) {
    lines.push(
      "",
      "# Host-facing local runtime URLs derived from resolved ports."
    )
    for (const definition of input.derivedEnv) {
      if (definition.description) {
        lines.push(`# ${definition.description}`)
      }
      const value = input.env[definition.env_var]
      if (value === undefined) {
        throw new Error(`Missing rendered value for ${definition.env_var}.`)
      }
      lines.push(`${definition.env_var}=${quoteShellEnvValue(value)}`)
    }
  }

  lines.push("")
  return `${lines.join("\n")}\n`
}

export async function executeLocalPortsResolve(
  input: LocalPortsResolveCommandInput
) {
  const config = await loadConfig(input.configPath)
  const runtimeEnvFilePath = resolve(
    repoRoot,
    input.outputPath ?? config.local_ports.runtime_env_file
  )
  const [envRaw, runtimeEnvRaw] = await Promise.all([
    readOptionalFile(input.envFilePath),
    readOptionalFile(runtimeEnvFilePath),
  ])
  const envFile = parseEnv(envRaw)
  const runtimeEnvFile = parseEnv(runtimeEnvRaw)
  const [dockerPorts, projectPorts] = await Promise.all([
    getDockerPublishedPorts(),
    getProjectPublishedPorts(input.projectName),
  ])
  const allocatedPorts = new Set<number>()
  const env: Record<string, string> = {}
  const ports: ResolvedPort[] = []

  for (const endpoint of config.local_ports.endpoints) {
    const preferred = resolvePreferredPort({
      endpoint,
      envFile,
      runtimeEnvFile,
    })
    const preferredPort = parsePort(preferred.value, endpoint.env_var)
    const resolved = await resolveEndpointPort({
      endpoint,
      preferredPort,
      source: preferred.source,
      dockerPorts,
      projectPorts,
      allocatedPorts,
    })

    ports.push(resolved)
    env[resolved.env_var] = String(resolved.resolved_port)
  }

  const renderedDerivedEnv: LocalDerivedEnv[] = []
  for (const definition of config.local_ports.derived_env) {
    if (!shouldRenderDerivedEnv({ definition, envFile, runtimeEnvFile })) {
      continue
    }

    env[definition.env_var] = renderTemplate(definition.value, {
      ...envFile,
      ...runtimeEnvFile,
      ...env,
    })
    renderedDerivedEnv.push(definition)
  }

  await mkdir(dirname(runtimeEnvFilePath), { recursive: true })
  await writeFile(
    runtimeEnvFilePath,
    renderRuntimeEnvFile({ ports, derivedEnv: renderedDerivedEnv, env }),
    "utf8"
  )

  return localPortsResolveResponseSchema.parse({
    config_path: input.configPath,
    env_file_path: input.envFilePath,
    output_path: runtimeEnvFilePath,
    project_name: input.projectName,
    ports,
    env,
  })
}
