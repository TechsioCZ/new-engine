import { mkdir, writeFile } from "node:fs/promises"
import nodePath from "node:path"

import type {
  PrepareCommandInput,
  PrepareResponse,
} from "../contracts/prepare.js"
import { prepareResponseSchema } from "../contracts/prepare.js"
import {
  listDeployableServices,
  listPrepareServiceIds,
} from "../contracts/stack-manifest.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import { loadManifest } from "./deploy-inputs.js"

const DEFAULT_PREVIEW_DB_PREFIX = "medusa_pr_"
const DEFAULT_PREVIEW_DB_APP_USER_PREFIX = "medusa_pr_app_"

export interface PrepareExecutionResult {
  response: PrepareResponse
  previewDbPassword: string
}

const writeJsonFile = async (path: string, value: unknown): Promise<void> => {
  await mkdir(nodePath.dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

const buildPreviewEnvironmentName = (input: PrepareCommandInput): string =>
  `${input.previewEnvPrefix}${input.prNumber ?? 0}`

const resolveRequiresPreviewDb = async (
  input: PrepareCommandInput,
): Promise<boolean> => {
  if (input.requiresPreviewDb) {
    return true
  }

  if (input.lane !== "preview" || input.dryRun) {
    return false
  }

  const manifest = await loadManifest(input.stackManifestPath)
  const previewBaselineServiceIds = new Set<string>()
  for (const service of listDeployableServices(manifest)) {
    if (
      service.enabledByDefault &&
      service.cloneToPreview &&
      service.deployLanes.includes("preview")
    ) {
      previewBaselineServiceIds.add(service.id)
    }
  }
  const previewDbPrepareServiceIds = listPrepareServiceIds(
    manifest,
    "preview_db",
  )
  const baselineNeedsPreviewDb = previewDbPrepareServiceIds.some((serviceId) =>
    previewBaselineServiceIds.has(serviceId),
  )

  if (!baselineNeedsPreviewDb) {
    return false
  }

  const previewCommitState = await new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken,
  ).readPreviewCommitState({
    environment_name: buildPreviewEnvironmentName(input),
    project_slug: input.projectSlug,
  })

  return !(
    previewCommitState.environment_exists &&
    previewCommitState.baseline_complete
  )
}

const executePreviewPrepare = async (
  input: PrepareCommandInput,
): Promise<PrepareExecutionResult> => {
  const prNumber = input.prNumber ?? 0
  const requiresPreviewDb = await resolveRequiresPreviewDb(input)

  if (!requiresPreviewDb) {
    const response = prepareResponseSchema.parse({
      lane: "preview",
      prepared: false,
      preview_db_created: false,
      preview_db_name: "",
      preview_db_password_redacted: false,
      preview_db_user: "",
      requires_preview_db: false,
    })

    if (input.outputJson !== undefined && input.outputJson !== "") {
      await writeJsonFile(input.outputJson, response)
    }

    return {
      previewDbPassword: "",
      response,
    }
  }

  let previewDb
  if (input.dryRun) {
    previewDb = {
      app_password: `dry-run:preview-db:${prNumber}`,
      app_user: `${DEFAULT_PREVIEW_DB_APP_USER_PREFIX}${prNumber}`,
      created: true,
      db_name: `${DEFAULT_PREVIEW_DB_PREFIX}${prNumber}`,
    }
  } else {
    const previewDbResult = await new ZaneOperatorClient(
      input.baseUrl,
      input.apiToken,
    ).ensurePreviewDb(prNumber)
    previewDb = previewDbResult.body
  }

  const response = prepareResponseSchema.parse({
    lane: "preview",
    prepared: true,
    preview_db_created: previewDb.created,
    preview_db_name: previewDb.db_name,
    preview_db_password_redacted: true,
    preview_db_user: previewDb.app_user,
    requires_preview_db: true,
  })

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    previewDbPassword: previewDb.app_password,
    response,
  }
}

const executeMainPrepare = async (
  input: PrepareCommandInput,
): Promise<PrepareExecutionResult> => {
  const response = prepareResponseSchema.parse({
    lane: "main",
    note: "main_prepare_not_used",
    prepared: false,
  })

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    previewDbPassword: "",
    response,
  }
}

export const executePrepare = async (
  input: PrepareCommandInput,
): Promise<PrepareExecutionResult> => {
  if (input.lane === "preview") {
    return await executePreviewPrepare(input)
  }

  return await executeMainPrepare(input)
}
