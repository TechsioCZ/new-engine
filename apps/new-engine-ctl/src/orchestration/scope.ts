import { execFile } from "node:child_process"
import type {
  ExecFileException,
  ExecFileOptionsWithStringEncoding,
} from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

import type { ScopeCommandInput, ScopeResponse } from "../contracts/scope.js"
import { scopeResponseSchema } from "../contracts/scope.js"
import { listRuntimeProviderServiceIds } from "../contracts/stack-inputs.js"
import {
  getGlobalRuntimeRules,
  getIgnorePathGlobs,
  listDeployableServices,
  listDowntimeRiskServiceIds,
  listLaneServiceIds,
  listPrepareServiceIds,
} from "../contracts/stack-manifest.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { loadDeployContracts, normalizeCsvToArray } from "./deploy-inputs.js"
import { withWorkspaceBinPath } from "./workspace-bin-path.js"

type NxStatus = ScopeResponse["nx_status"]

interface ExecResult {
  stdout: string
  stderr: string
}

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== ""

const toExecFileCallback =
  (settle: (error: ExecFileException | null, result: ExecResult) => void) =>
  (error: ExecFileException | null, stdout: string, stderr: string): void => {
    settle(error, { stderr, stdout })
  }

const execFileAsync = promisify(
  (
    command: string,
    args: readonly string[],
    options: ExecFileOptionsWithStringEncoding,
    settle: (error: ExecFileException | null, result: ExecResult) => void,
  ) => {
    execFile(command, args, options, toExecFileCallback(settle))
  },
)

const toCsv = (values: string[]): string =>
  normalizeCsvToArray(values.join(",")).join(",")

const listManifestServiceIds = (manifest: StackManifest): string[] =>
  manifest.services.map((service) => service.id)

const toJsonFileContents = (value: unknown): string =>
  `${JSON.stringify(value)}\n`

const writeJsonFile = async (
  filePath: string,
  value: unknown,
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, toJsonFileContents(value), "utf-8")
}

const runCommand = async (
  command: string,
  args: string[],
  options?: {
    env?: NodeJS.ProcessEnv
  },
): Promise<ExecResult> =>
  await execFileAsync(command, args, {
    cwd: process.cwd(),
    env: options?.env,
    maxBuffer: 10 * 1024 * 1024,
  })

const verifyGitRevision = async (
  revision: string,
  label: string,
): Promise<void> => {
  try {
    await runCommand("git", ["rev-parse", "--verify", `${revision}^{commit}`])
  } catch {
    throw new Error(`Invalid ${label}: ${revision}`)
  }
}

const resolveChangedFiles = async (
  baseSha: string,
  headSha: string,
): Promise<string[]> => {
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

const pathMatchesAnyGlob = (filePath: string, globs: string[]): boolean =>
  globs.some((pattern) => path.matchesGlob(filePath, pattern))

const filterRelevantChangedFiles = (
  changedFiles: string[],
  ignoreGlobs: string[],
): string[] =>
  changedFiles.filter((filePath) => !pathMatchesAnyGlob(filePath, ignoreGlobs))

const resolveNxAffectedProjects = async (input: {
  baseSha: string
  headSha: string
  nxIsolatePlugins: boolean
}): Promise<{
  nxStatus: NxStatus
  projects: string[]
}> => {
  try {
    const result = await runCommand(
      "nubx",
      [
        "--node",
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
          ...withWorkspaceBinPath(process.env),
          NX_DAEMON: "false",
          NX_ISOLATE_PLUGINS: String(input.nxIsolatePlugins),
        },
      },
    )
    const parsed = JSON.parse(result.stdout) as unknown
    if (!Array.isArray(parsed)) {
      throw new TypeError("nx affected output was not an array")
    }

    return {
      nxStatus: "ok",
      projects: parsed.filter(
        (value): value is string => typeof value === "string",
      ),
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error("Required command not found: nubx", { cause: error })
    }

    return {
      nxStatus: "fallback",
      projects: [],
    }
  }
}

const assertExplicitServicesAllowed = (
  manifest: StackManifest,
  lane: ScopeCommandInput["lane"],
  servicesCsv: string,
): string[] => {
  const requested = normalizeCsvToArray(servicesCsv)
  const allowed = new Set(listLaneServiceIds(manifest, lane))
  const invalid = requested.filter((serviceId) => !allowed.has(serviceId))

  if (invalid.length > 0) {
    throw new Error(
      `Explicit services are not deployable on lane ${lane}: ${invalid.join(",")}`,
    )
  }

  return requested
}

const listPreviewBaselinePrepareServiceIds = (
  manifest: StackManifest,
): string[] => {
  const previewClonedServiceIds = new Set<string>()

  for (const service of listDeployableServices(manifest)) {
    if (
      service.enabledByDefault &&
      service.deployLanes.includes("preview") &&
      service.cloneToPreview
    ) {
      previewClonedServiceIds.add(service.id)
    }
  }

  return listPrepareServiceIds(manifest, "preview_db").filter((serviceId) =>
    previewClonedServiceIds.has(serviceId),
  )
}

const applyPrepareAndDowntimeState = (input: {
  lane: ScopeCommandInput["lane"]
  servicesCsv: string
  manifest: StackManifest
  previewBaselineComplete: boolean
}): Pick<
  ScopeResponse,
  | "should_prepare"
  | "requires_preview_db"
  | "preview_db_service_ids"
  | "requires_downtime_approval"
  | "downtime_service_ids"
> => {
  const selected = new Set(normalizeCsvToArray(input.servicesCsv))

  const previewDbServiceIds =
    input.lane === "preview"
      ? normalizeCsvToArray(
          [
            ...listPrepareServiceIds(input.manifest, "preview_db").filter(
              (serviceId) => selected.has(serviceId),
            ),
            ...(input.previewBaselineComplete
              ? []
              : listPreviewBaselinePrepareServiceIds(input.manifest)),
          ].join(","),
        )
      : []
  const downtimeServiceIds =
    input.lane === "main"
      ? listDowntimeRiskServiceIds(input.manifest, "main").filter((serviceId) =>
          selected.has(serviceId),
        )
      : []

  return {
    downtime_service_ids: downtimeServiceIds.join(","),
    preview_db_service_ids: previewDbServiceIds.join(","),
    requires_downtime_approval: downtimeServiceIds.length > 0,
    requires_preview_db: previewDbServiceIds.length > 0,
    should_prepare: previewDbServiceIds.length > 0,
  }
}

const logMainRuntimeProviderScope = (input: {
  servicesCsv: string
  stackInputs: Awaited<ReturnType<typeof loadDeployContracts>>["stackInputs"]
}): void => {
  const selected = new Set(normalizeCsvToArray(input.servicesCsv))
  const serviceIds = listRuntimeProviderServiceIds(
    input.stackInputs,
    "meili_api_credentials",
  ).filter((serviceId) => selected.has(serviceId))

  if (serviceIds.length > 0) {
    process.stderr.write(
      `[scope] Main runtime provider meili_api_credentials is relevant for: ${serviceIds.join(",")}.\n`,
    )
  }
}

const createServiceFlagMap = (
  manifest: StackManifest,
): Map<string, boolean> => {
  const serviceFlags = new Map<string, boolean>()

  for (const serviceId of listManifestServiceIds(manifest)) {
    serviceFlags.set(serviceId, false)
  }

  return serviceFlags
}

const markTriggeredRuntimeRuleServices = (input: {
  manifest: StackManifest
  relevantChangedFiles: string[]
  serviceFlags: Map<string, boolean>
}): void => {
  for (const rule of getGlobalRuntimeRules(input.manifest)) {
    const triggered = input.relevantChangedFiles.some((filePath) =>
      pathMatchesAnyGlob(filePath, rule.pathGlobs),
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

const markFallbackNxServices = (input: {
  manifest: StackManifest
  nxStatus: NxStatus
  serviceFlags: Map<string, boolean>
}): void => {
  if (input.nxStatus !== "fallback") {
    return
  }

  for (const service of input.manifest.services) {
    if (service.nx_projects.length > 0) {
      input.serviceFlags.set(service.id, true)
    }
  }
}

const isServiceAffectedByScope = (input: {
  service: StackManifest["services"][number]
  nxProjects: Set<string>
  relevantChangedFiles: string[]
}): boolean => {
  if (
    input.service.nx_projects.some((project) => input.nxProjects.has(project))
  ) {
    return true
  }

  if (input.service.ci.affected_path_globs.length === 0) {
    return false
  }

  return input.relevantChangedFiles.some((filePath) =>
    pathMatchesAnyGlob(filePath, input.service.ci.affected_path_globs),
  )
}

const markAffectedServices = (input: {
  manifest: StackManifest
  nxProjects: string[]
  relevantChangedFiles: string[]
  serviceFlags: Map<string, boolean>
}): void => {
  const nxProjectSet = new Set(input.nxProjects)

  for (const service of input.manifest.services) {
    if (
      isServiceAffectedByScope({
        nxProjects: nxProjectSet,
        relevantChangedFiles: input.relevantChangedFiles,
        service,
      })
    ) {
      input.serviceFlags.set(service.id, true)
    }
  }
}

const resolveServicesFromGitDiff = (input: {
  manifest: StackManifest
  relevantChangedFiles: string[]
  nxStatus: NxStatus
  nxProjects: string[]
}): string[] => {
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

  return orderedServiceIds.filter(
    (serviceId) => serviceFlags.get(serviceId) === true,
  )
}

const filterServicesAllowedInLane = (input: {
  manifest: StackManifest
  lane: ScopeCommandInput["lane"]
  servicesCsv: string
  defaultOnly?: boolean
}): string => {
  const allowed = new Set(
    listLaneServiceIds(input.manifest, input.lane, input.defaultOnly ?? false),
  )

  return normalizeCsvToArray(input.servicesCsv)
    .filter((serviceId) => allowed.has(serviceId))
    .join(",")
}

export const executeScope = async (
  input: ScopeCommandInput,
): Promise<ScopeResponse> => {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath,
  )
  const { manifest } = contracts

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
      input.servicesCsv,
    ).join(",")
    baseSha = null
    headSha = null
  } else {
    if (input.baseSha === undefined) {
      throw new Error(
        "Base SHA is required when services CSV is not provided explicitly.",
      )
    }
    const resolvedBaseSha = input.baseSha
    await verifyGitRevision(resolvedBaseSha, "base SHA")
    await verifyGitRevision(input.headSha, "head SHA")

    changedFiles = await resolveChangedFiles(resolvedBaseSha, input.headSha)
    relevantChangedFiles = filterRelevantChangedFiles(
      changedFiles,
      getIgnorePathGlobs(manifest),
    )

    const nx = await resolveNxAffectedProjects({
      baseSha: resolvedBaseSha,
      headSha: input.headSha,
      nxIsolatePlugins: input.nxIsolatePlugins,
    })
    ;({ nxStatus } = nx)
    projectsCsv = toCsv(nx.projects)
    servicesCsv = resolveServicesFromGitDiff({
      manifest,
      nxProjects: nx.projects,
      nxStatus,
      relevantChangedFiles,
    }).join(",")
    servicesCsv = filterServicesAllowedInLane({
      defaultOnly: true,
      lane: input.lane,
      manifest,
      servicesCsv,
    })
  }

  const prepareAndDowntime = applyPrepareAndDowntimeState({
    lane: input.lane,
    manifest,
    previewBaselineComplete: input.previewBaselineComplete,
    servicesCsv,
  })

  if (input.lane === "main" && servicesCsv) {
    logMainRuntimeProviderScope({
      servicesCsv,
      stackInputs: contracts.stackInputs,
    })
  }

  const response = scopeResponseSchema.parse({
    base_sha: baseSha,
    changed_files: changedFiles,
    changed_files_count: changedFiles.length,
    head_sha: headSha,
    lane: input.lane,
    mode,
    nx_status: nxStatus,
    projects_csv: projectsCsv,
    relevant_changed_files: relevantChangedFiles,
    services_csv: servicesCsv,
    ...prepareAndDowntime,
  })

  if (hasText(input.outputJson)) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
