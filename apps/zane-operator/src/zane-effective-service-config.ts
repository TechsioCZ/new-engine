import type {
  ZaneServiceDetails,
  ZaneServiceHealthcheck,
  ZaneServiceResourceLimits,
} from "./zane-contract"

type PendingFieldChange = {
  field?: string
  type?: "ADD" | "UPDATE" | "DELETE" | string
  new_value?: Record<string, unknown> | null
}

export type EffectiveGitSource = {
  repository_url: string | null
  branch_name: string | null
  commit_sha: string | null
  git_app_id: string | null
}

export type EffectiveBuilder = {
  builder: string | null
  dockerfile_path: string | null
  build_context_dir: string | null
  build_stage_target: string | null
}

function getLastPendingFieldChange(
  serviceDetails: Pick<ZaneServiceDetails, "unapplied_changes">,
  field: string
): PendingFieldChange | null {
  const matchingChanges = (serviceDetails.unapplied_changes ?? []).filter(
    (change) => change.field === field
  )

  return matchingChanges[matchingChanges.length - 1] ?? null
}

function normalizeString(
  value: unknown
): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeHealthcheck(
  value: unknown
): ZaneServiceHealthcheck | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const type = normalizeString(record.type)
  const path = normalizeString(record.value)
  const timeoutSeconds =
    typeof record.timeout_seconds === "number" ? record.timeout_seconds : null
  const intervalSeconds =
    typeof record.interval_seconds === "number" ? record.interval_seconds : null

  if (!type || !path || timeoutSeconds === null || intervalSeconds === null) {
    return null
  }

  return {
    type,
    value: path,
    timeout_seconds: timeoutSeconds,
    interval_seconds: intervalSeconds,
    associated_port:
      typeof record.associated_port === "number" ? record.associated_port : null,
  }
}

function normalizeResourceLimits(
  value: unknown
): ZaneServiceResourceLimits | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const memory =
    record.memory && typeof record.memory === "object" && !Array.isArray(record.memory)
      ? (record.memory as { unit?: string; value?: number | string | null })
      : null

  return {
    cpus:
      typeof record.cpus === "number" || typeof record.cpus === "string"
        ? record.cpus
        : null,
    memory: memory
      ? {
          unit: typeof memory.unit === "string" ? memory.unit : undefined,
          value:
            typeof memory.value === "number" || typeof memory.value === "string"
              ? memory.value
              : undefined,
        }
      : null,
  }
}

export function computeEffectiveGitSource(
  serviceDetails: Pick<
    ZaneServiceDetails,
    "repository_url" | "branch_name" | "commit_sha" | "git_app" | "unapplied_changes"
  >
): EffectiveGitSource {
  const pending = getLastPendingFieldChange(serviceDetails, "git_source")
  const pendingValue = pending?.new_value

  if (pendingValue) {
    return {
      repository_url: normalizeString(pendingValue.repository_url),
      branch_name: normalizeString(pendingValue.branch_name),
      commit_sha: normalizeString(pendingValue.commit_sha),
      git_app_id: normalizeString(pendingValue.git_app_id),
    }
  }

  return {
    repository_url: normalizeString(serviceDetails.repository_url),
    branch_name: normalizeString(serviceDetails.branch_name),
    commit_sha: normalizeString(serviceDetails.commit_sha) ?? "HEAD",
    git_app_id: normalizeString(serviceDetails.git_app?.id),
  }
}

export function computeEffectiveBuilder(
  serviceDetails: Pick<
    ZaneServiceDetails,
    "builder" | "dockerfile_builder_options" | "unapplied_changes"
  >
): EffectiveBuilder {
  const pending = getLastPendingFieldChange(serviceDetails, "builder")
  const pendingValue = pending?.new_value

  if (pendingValue) {
    return {
      builder: normalizeString(pendingValue.builder),
      dockerfile_path: normalizeString(pendingValue.dockerfile_path),
      build_context_dir: normalizeString(pendingValue.build_context_dir),
      build_stage_target: normalizeString(pendingValue.build_stage_target),
    }
  }

  return {
    builder: normalizeString(serviceDetails.builder),
    dockerfile_path: normalizeString(
      serviceDetails.dockerfile_builder_options?.dockerfile_path
    ),
    build_context_dir: normalizeString(
      serviceDetails.dockerfile_builder_options?.build_context_dir
    ),
    build_stage_target: normalizeString(
      serviceDetails.dockerfile_builder_options?.build_stage_target
    ),
  }
}

export function computeEffectiveHealthcheck(
  serviceDetails: Pick<ZaneServiceDetails, "healthcheck" | "unapplied_changes">
): ZaneServiceHealthcheck | null {
  const pending = getLastPendingFieldChange(serviceDetails, "healthcheck")
  return pending?.new_value
    ? normalizeHealthcheck(pending.new_value)
    : normalizeHealthcheck(serviceDetails.healthcheck)
}

export function computeEffectiveResourceLimits(
  serviceDetails: Pick<ZaneServiceDetails, "resource_limits" | "unapplied_changes">
): ZaneServiceResourceLimits | null {
  const pending = getLastPendingFieldChange(serviceDetails, "resource_limits")
  return pending?.new_value
    ? normalizeResourceLimits(pending.new_value)
    : normalizeResourceLimits(serviceDetails.resource_limits)
}
