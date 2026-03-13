import { execFile } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, matchesGlob } from "node:path"
import { promisify } from "node:util"

import type { ScopeCommandInput, ScopeResponse } from "../contracts/scope.js"
import { scopeResponseSchema } from "../contracts/scope.js"
import {
  getGlobalRuntimeRules,
  getIgnorePathGlobs,
  listDowntimeRiskServiceIds,
  listLaneServiceIds,
  listPrepareServiceIds,
  type StackManifest,
} from "../contracts/stack-manifest.js"
import { loadManifest, normalizeCsvToArray } from "./deploy-inputs.js"

const execFileAsync = promisify(execFile)

type NxStatus = ScopeResponse["nx_status"]

type ExecResult = {
  stdout: string
  stderr: string
}

function toCsv(values: string[]): string {
  return normalizeCsvToArray(values.join(",")).join(",")
}

function listManifestServiceIds(manifest: StackManifest): string[] {
  return manifest.services.map((service) => service.id)
}

function toJsonFileContents(value: unknown): string {
  return `${JSON.stringify(value)}\n`
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, toJsonFileContents(value), "utf8")
}

async function runCommand(
  command: string,
  args: string[],
  options?: {
    env?: NodeJS.ProcessEnv
  }
): Promise<ExecResult> {
  const result = await execFileAsync(command, args, {
    cwd: process.cwd(),
    env: options?.env,
    maxBuffer: 10 * 1024 * 1024,
  })

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

async function verifyGitRevision(
  revision: string,
  label: string
): Promise<void> {
  try {
    await runCommand("git", ["rev-parse", "--verify", `${revision}^{commit}`])
  } catch {
    throw new Error(`Invalid ${label}: ${revision}`)
  }
}

async function resolveChangedFiles(
  baseSha: string,
  headSha: string
): Promise<string[]> {
  const result = await runCommand("git", [
    "diff",
    "--name-only",
    baseSha,
    headSha,
  ])

  return result.stdout
    .split("\n")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

function pathMatchesAnyGlob(path: string, globs: string[]): boolean {
  return globs.some((pattern) => matchesGlob(path, pattern))
}

function filterRelevantChangedFiles(
  changedFiles: string[],
  ignoreGlobs: string[]
): string[] {
  return changedFiles.filter((path) => !pathMatchesAnyGlob(path, ignoreGlobs))
}

async function resolveNxAffectedProjects(input: {
  baseSha: string
  headSha: string
  nxIsolatePlugins: boolean
}): Promise<{
  nxStatus: NxStatus
  projects: string[]
}> {
  try {
    const result = await runCommand(
      "pnpm",
      [
        "exec",
        "nx",
        "show",
        "projects",
        "--affected",
        "--json",
        `--base=${input.baseSha}`,
        `--head=${input.headSha}`,
      ],
      {
        env: {
          ...process.env,
          NX_DAEMON: "false",
          NX_ISOLATE_PLUGINS: String(input.nxIsolatePlugins),
        },
      }
    )
    const parsed = JSON.parse(result.stdout) as unknown
    if (!Array.isArray(parsed)) {
      throw new Error("nx affected output was not an array")
    }

    return {
      nxStatus: "ok",
      projects: parsed.filter(
        (value): value is string => typeof value === "string"
      ),
    }
  } catch {
    return {
      nxStatus: "fallback",
      projects: [],
    }
  }
}

function assertExplicitServicesAllowed(
  manifest: StackManifest,
  lane: ScopeCommandInput["lane"],
  servicesCsv: string
): string[] {
  const requested = normalizeCsvToArray(servicesCsv)
  const allowed = new Set(listLaneServiceIds(manifest, lane))
  const invalid = requested.filter((serviceId) => !allowed.has(serviceId))

  if (invalid.length > 0) {
    throw new Error(
      `Explicit services are not deployable on lane ${lane}: ${invalid.join(",")}`
    )
  }

  return requested
}

function applyPrepareAndDowntimeState(input: {
  lane: ScopeCommandInput["lane"]
  servicesCsv: string
  manifest: StackManifest
}): Pick<
  ScopeResponse,
  | "should_prepare"
  | "requires_preview_db"
  | "requires_meili_keys"
  | "preview_db_service_ids"
  | "meili_key_service_ids"
  | "requires_downtime_approval"
  | "downtime_service_ids"
> {
  const selected = new Set(normalizeCsvToArray(input.servicesCsv))

  const previewDbServiceIds =
    input.lane === "preview"
      ? listPrepareServiceIds(input.manifest, "preview_db").filter(
          (serviceId) => selected.has(serviceId)
        )
      : []
  const meiliKeyServiceIds =
    input.lane === "main"
      ? listPrepareServiceIds(input.manifest, "meili_keys").filter(
          (serviceId) => selected.has(serviceId)
        )
      : []
  const downtimeServiceIds =
    input.lane === "main"
      ? listDowntimeRiskServiceIds(input.manifest, "main").filter((serviceId) =>
          selected.has(serviceId)
        )
      : []

  return {
    should_prepare:
      previewDbServiceIds.length > 0 || meiliKeyServiceIds.length > 0,
    requires_preview_db: previewDbServiceIds.length > 0,
    requires_meili_keys: meiliKeyServiceIds.length > 0,
    preview_db_service_ids: previewDbServiceIds.join(","),
    meili_key_service_ids: meiliKeyServiceIds.join(","),
    requires_downtime_approval: downtimeServiceIds.length > 0,
    downtime_service_ids: downtimeServiceIds.join(","),
  }
}

function createServiceFlagMap(manifest: StackManifest): Map<string, boolean> {
  const serviceFlags = new Map<string, boolean>()

  for (const serviceId of listManifestServiceIds(manifest)) {
    serviceFlags.set(serviceId, false)
  }

  return serviceFlags
}

function markTriggeredRuntimeRuleServices(input: {
  manifest: StackManifest
  relevantChangedFiles: string[]
  serviceFlags: Map<string, boolean>
}): void {
  for (const rule of getGlobalRuntimeRules(input.manifest)) {
    const triggered = input.relevantChangedFiles.some((path) =>
      pathMatchesAnyGlob(path, rule.pathGlobs)
    )
    if (!triggered) {
      continue
    }

    for (const serviceId of rule.serviceIds) {
      if (input.serviceFlags.has(serviceId)) {
        input.serviceFlags.set(serviceId, true)
      }
    }
  }
}

function markFallbackNxServices(input: {
  manifest: StackManifest
  nxStatus: NxStatus
  serviceFlags: Map<string, boolean>
}): void {
  if (input.nxStatus !== "fallback") {
    return
  }

  for (const service of input.manifest.services) {
    if (service.nx_projects.length > 0) {
      input.serviceFlags.set(service.id, true)
    }
  }
}

function isServiceAffectedByScope(input: {
  service: StackManifest["services"][number]
  nxProjects: Set<string>
  relevantChangedFiles: string[]
}): boolean {
  if (
    input.service.nx_projects.some((project) => input.nxProjects.has(project))
  ) {
    return true
  }

  if (input.service.ci.affected_path_globs.length === 0) {
    return false
  }

  return input.relevantChangedFiles.some((path) =>
    pathMatchesAnyGlob(path, input.service.ci.affected_path_globs)
  )
}

function markAffectedServices(input: {
  manifest: StackManifest
  nxProjects: string[]
  relevantChangedFiles: string[]
  serviceFlags: Map<string, boolean>
}): void {
  const nxProjectSet = new Set(input.nxProjects)

  for (const service of input.manifest.services) {
    if (
      isServiceAffectedByScope({
        service,
        nxProjects: nxProjectSet,
        relevantChangedFiles: input.relevantChangedFiles,
      })
    ) {
      input.serviceFlags.set(service.id, true)
    }
  }
}

function resolveServicesFromGitDiff(input: {
  manifest: StackManifest
  relevantChangedFiles: string[]
  nxStatus: NxStatus
  nxProjects: string[]
}): string[] {
  const serviceFlags = createServiceFlagMap(input.manifest)
  const orderedServiceIds = listManifestServiceIds(input.manifest)

  markTriggeredRuntimeRuleServices({
    manifest: input.manifest,
    relevantChangedFiles: input.relevantChangedFiles,
    serviceFlags,
  })
  markFallbackNxServices({
    manifest: input.manifest,
    nxStatus: input.nxStatus,
    serviceFlags,
  })
  markAffectedServices({
    manifest: input.manifest,
    nxProjects: input.nxProjects,
    relevantChangedFiles: input.relevantChangedFiles,
    serviceFlags,
  })

  return orderedServiceIds.filter((serviceId) => serviceFlags.get(serviceId))
}

export async function executeScope(
  input: ScopeCommandInput
): Promise<ScopeResponse> {
  const manifest = await loadManifest(input.stackManifestPath)

  let mode: ScopeResponse["mode"] = "git"
  let baseSha: string | null = input.baseSha ?? null
  let headSha: string | null = input.headSha
  let projectsCsv = ""
  let servicesCsv = ""
  let nxStatus: NxStatus = "explicit"
  let changedFiles: string[] = []
  let relevantChangedFiles: string[] = []

  if (input.servicesCsv) {
    mode = "explicit"
    servicesCsv = assertExplicitServicesAllowed(
      manifest,
      input.lane,
      input.servicesCsv
    ).join(",")
    baseSha = null
    headSha = null
  } else {
    const resolvedBaseSha = input.baseSha as string
    await verifyGitRevision(resolvedBaseSha, "base SHA")
    await verifyGitRevision(input.headSha, "head SHA")

    changedFiles = await resolveChangedFiles(resolvedBaseSha, input.headSha)
    relevantChangedFiles = filterRelevantChangedFiles(
      changedFiles,
      getIgnorePathGlobs(manifest)
    )

    const nx = await resolveNxAffectedProjects({
      baseSha: resolvedBaseSha,
      headSha: input.headSha,
      nxIsolatePlugins: input.nxIsolatePlugins,
    })
    nxStatus = nx.nxStatus
    projectsCsv = toCsv(nx.projects)
    servicesCsv = resolveServicesFromGitDiff({
      manifest,
      relevantChangedFiles,
      nxStatus,
      nxProjects: nx.projects,
    }).join(",")
  }

  const prepareAndDowntime = applyPrepareAndDowntimeState({
    lane: input.lane,
    servicesCsv,
    manifest,
  })

  const response = scopeResponseSchema.parse({
    lane: input.lane,
    mode,
    base_sha: baseSha,
    head_sha: headSha,
    projects_csv: projectsCsv,
    services_csv: servicesCsv,
    nx_status: nxStatus,
    changed_files_count: changedFiles.length,
    changed_files: changedFiles,
    relevant_changed_files: relevantChangedFiles,
    ...prepareAndDowntime,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
