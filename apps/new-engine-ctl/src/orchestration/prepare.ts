import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  PrepareCommandInput,
  PrepareResponse,
} from "../contracts/prepare.js"
import { prepareResponseSchema } from "../contracts/prepare.js"
import {
  provisionMeiliKeys,
  verifyMeiliKeys,
} from "../providers/meilisearch.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import { loadDeployContracts } from "./deploy-inputs.js"

const DEFAULT_PREVIEW_DB_PREFIX = "medusa_pr_"
const DEFAULT_PREVIEW_DB_APP_USER_PREFIX = "medusa_pr_app_"
const trailingSlashesPattern = /\/+$/

export type PrepareExecutionResult = {
  response: PrepareResponse
  previewDbPassword: string
  meiliBackendKey: string
  meiliFrontendKey: string
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

function normalizeUrl(url: string): string {
  return url.replace(trailingSlashesPattern, "")
}

async function executePreviewPrepare(
  input: PrepareCommandInput
): Promise<PrepareExecutionResult> {
  const prNumber = input.prNumber ?? 0

  if (!input.requiresPreviewDb) {
    const response = prepareResponseSchema.parse({
      lane: "preview",
      prepared: false,
      requires_preview_db: false,
      preview_db_created: false,
      preview_db_name: "",
      preview_db_user: "",
      preview_db_password_redacted: false,
    })

    if (input.outputJson) {
      await writeJsonFile(input.outputJson, response)
    }

    return {
      response,
      previewDbPassword: "",
      meiliBackendKey: "",
      meiliFrontendKey: "",
    }
  }

  const previewDb = input.dryRun
    ? {
        created: true,
        db_name: `${DEFAULT_PREVIEW_DB_PREFIX}${prNumber}`,
        app_user: `${DEFAULT_PREVIEW_DB_APP_USER_PREFIX}${prNumber}`,
        app_password: `dry-run:preview-db:${prNumber}`,
      }
    : (
        await new ZaneOperatorClient(
          input.baseUrl,
          input.apiToken
        ).ensurePreviewDb(prNumber)
      ).body

  const response = prepareResponseSchema.parse({
    lane: "preview",
    prepared: true,
    requires_preview_db: true,
    preview_db_created: previewDb.created,
    preview_db_name: previewDb.db_name,
    preview_db_user: previewDb.app_user,
    preview_db_password_redacted: true,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    response,
    previewDbPassword: previewDb.app_password,
    meiliBackendKey: "",
    meiliFrontendKey: "",
  }
}

async function executeMainPrepare(
  input: PrepareCommandInput
): Promise<PrepareExecutionResult> {
  if (!input.requiresMeiliKeys) {
    const response = prepareResponseSchema.parse({
      lane: "main",
      prepared: false,
      requires_meili_keys: false,
      meili_url: normalizeUrl(input.meiliUrl),
      meili_frontend_env_var: "",
      meili_frontend_uid: "",
      meili_frontend_created: false,
      meili_frontend_updated: false,
      meili_verified: false,
    })

    if (input.outputJson) {
      await writeJsonFile(input.outputJson, response)
    }

    return {
      response,
      previewDbPassword: "",
      meiliBackendKey: "",
      meiliFrontendKey: "",
    }
  }

  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath
  )
  const provisioned = input.dryRun
    ? {
        meili_url: normalizeUrl(input.meiliUrl),
        backend_key: "dry-run:main:backend",
        frontend_key: "dry-run:main:frontend",
        backend_uid: "2f2e1f59-7b5a-4f2f-9f28-7a9137f7e6c1",
        frontend_uid: "3a6b6d2c-1e2f-4b8c-8d4f-0f7c2b9a1d55",
        backend_created: false,
        frontend_created: true,
        backend_updated: false,
        frontend_updated: false,
        backend_env_var: "DC_MEILISEARCH_BACKEND_API_KEY",
        frontend_env_var: "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
      }
    : await provisionMeiliKeys({
        meiliUrl: input.meiliUrl,
        masterKey: input.meiliMasterKey,
        waitSeconds: input.meiliWaitSeconds,
        retryCount: input.retryCount,
        retryDelaySeconds: input.retryDelaySeconds,
        stackInputs: contracts.stackInputs,
        providerId: input.searchCredentialsProviderId,
      })

  const verified = input.dryRun
    ? { result: "ok" as const }
    : await verifyMeiliKeys({
        meiliUrl: input.meiliUrl,
        masterKey: input.meiliMasterKey,
        backendKey: provisioned.backend_key,
        frontendKey: provisioned.frontend_key,
        waitSeconds: input.meiliWaitSeconds,
        retryCount: input.retryCount,
        retryDelaySeconds: input.retryDelaySeconds,
      })

  const response = prepareResponseSchema.parse({
    lane: "main",
    prepared: true,
    requires_meili_keys: true,
    meili_url: provisioned.meili_url,
    meili_frontend_env_var: provisioned.frontend_env_var,
    meili_frontend_uid: provisioned.frontend_uid,
    meili_frontend_created: provisioned.frontend_created,
    meili_frontend_updated: provisioned.frontend_updated,
    meili_verified: verified.result === "ok",
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    response,
    previewDbPassword: "",
    meiliBackendKey: provisioned.backend_key,
    meiliFrontendKey: provisioned.frontend_key,
  }
}

export async function executePrepare(
  input: PrepareCommandInput
): Promise<PrepareExecutionResult> {
  if (input.lane === "preview") {
    return await executePreviewPrepare(input)
  }

  return await executeMainPrepare(input)
}
