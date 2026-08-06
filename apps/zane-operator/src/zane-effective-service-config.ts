import { isRecord } from "@techsio/std/object"

import type {
  ZaneServiceDetails,
  ZaneServiceHealthcheck,
  ZaneServiceResourceLimits,
} from "./zane-contract"

interface PendingFieldChange {
  field?: string
  type?: string
  new_value?: Record<string, unknown> | null
}

export interface EffectiveGitSource {
  repository_url: string | null
  branch_name: string | null
  commit_sha: string | null
  git_app_id: string | null
}

export interface EffectiveBuilder {
  builder: string | null
  dockerfile_path: string | null
  build_context_dir: string | null
  build_stage_target: string | null
}

const getLastPendingFieldChange = (
  serviceDetails: Pick<ZaneServiceDetails, "unapplied_changes">,
  field: string,
): PendingFieldChange | null => {
  const matchingChanges = (serviceDetails.unapplied_changes ?? []).filter(
    (change) => change.field === field,
  )

  return matchingChanges.at(-1) ?? null
}

const normalizeString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null

const normalizeHealthcheck = (
  value: unknown,
): ZaneServiceHealthcheck | null => {
  if (!isRecord(value)) {
    return null
  }

  const type = normalizeString(value.type)
  const path = normalizeString(value.value)
  const timeoutValue = value.timeout_seconds
  const intervalValue = value.interval_seconds
  const associatedPortValue = value.associated_port
  const timeoutSeconds = typeof timeoutValue === "number" ? timeoutValue : null
  const intervalSeconds =
    typeof intervalValue === "number" ? intervalValue : null

  if (
    type === null ||
    path === null ||
    timeoutSeconds === null ||
    intervalSeconds === null
  ) {
    return null
  }

  return {
    associated_port:
      typeof associatedPortValue === "number" ? associatedPortValue : null,
    interval_seconds: intervalSeconds,
    timeout_seconds: timeoutSeconds,
    type,
    value: path,
  }
}

const normalizeResourceLimits = (
  value: unknown,
): ZaneServiceResourceLimits | null => {
  if (!isRecord(value)) {
    return null
  }

  const { cpus: cpuValue, memory: memoryValue } = value
  const memory = isRecord(memoryValue) ? memoryValue : null
  let normalizedMemory: ZaneServiceResourceLimits["memory"] = null
  if (memory !== null) {
    const { unit, value: memoryAmount } = memory
    normalizedMemory = {
      ...(typeof unit === "string" ? { unit } : {}),
      ...(typeof memoryAmount === "number" || typeof memoryAmount === "string"
        ? { value: memoryAmount }
        : {}),
    }
  }

  return {
    cpus:
      typeof cpuValue === "number" || typeof cpuValue === "string"
        ? cpuValue
        : null,
    memory: normalizedMemory,
  }
}

export const computeEffectiveGitSource = (
  serviceDetails: Pick<
    ZaneServiceDetails,
    | "repository_url"
    | "branch_name"
    | "commit_sha"
    | "git_app"
    | "unapplied_changes"
  >,
): EffectiveGitSource => {
  const pending = getLastPendingFieldChange(serviceDetails, "git_source")
  const pendingValue = pending?.new_value

  if (pendingValue !== undefined && pendingValue !== null) {
    return {
      branch_name: normalizeString(pendingValue.branch_name),
      commit_sha: normalizeString(pendingValue.commit_sha),
      git_app_id: normalizeString(pendingValue.git_app_id),
      repository_url: normalizeString(pendingValue.repository_url),
    }
  }

  return {
    branch_name: normalizeString(serviceDetails.branch_name),
    commit_sha: normalizeString(serviceDetails.commit_sha) ?? "HEAD",
    git_app_id: normalizeString(serviceDetails.git_app?.id),
    repository_url: normalizeString(serviceDetails.repository_url),
  }
}

export const computeEffectiveBuilder = (
  serviceDetails: Pick<
    ZaneServiceDetails,
    "builder" | "dockerfile_builder_options" | "unapplied_changes"
  >,
): EffectiveBuilder => {
  const pending = getLastPendingFieldChange(serviceDetails, "builder")
  const pendingValue = pending?.new_value

  if (pendingValue !== undefined && pendingValue !== null) {
    return {
      build_context_dir: normalizeString(pendingValue.build_context_dir),
      build_stage_target: normalizeString(pendingValue.build_stage_target),
      builder: normalizeString(pendingValue.builder),
      dockerfile_path: normalizeString(pendingValue.dockerfile_path),
    }
  }

  return {
    build_context_dir: normalizeString(
      serviceDetails.dockerfile_builder_options?.build_context_dir,
    ),
    build_stage_target: normalizeString(
      serviceDetails.dockerfile_builder_options?.build_stage_target,
    ),
    builder: normalizeString(serviceDetails.builder),
    dockerfile_path: normalizeString(
      serviceDetails.dockerfile_builder_options?.dockerfile_path,
    ),
  }
}

export const computeEffectiveHealthcheck = (
  serviceDetails: Pick<ZaneServiceDetails, "healthcheck" | "unapplied_changes">,
): ZaneServiceHealthcheck | null => {
  const pending = getLastPendingFieldChange(serviceDetails, "healthcheck")
  return pending?.new_value !== undefined && pending.new_value !== null
    ? normalizeHealthcheck(pending.new_value)
    : normalizeHealthcheck(serviceDetails.healthcheck)
}

export const computeEffectiveResourceLimits = (
  serviceDetails: Pick<
    ZaneServiceDetails,
    "resource_limits" | "unapplied_changes"
  >,
): ZaneServiceResourceLimits | null => {
  const pending = getLastPendingFieldChange(serviceDetails, "resource_limits")
  return pending?.new_value !== undefined && pending.new_value !== null
    ? normalizeResourceLimits(pending.new_value)
    : normalizeResourceLimits(serviceDetails.resource_limits)
}
