import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  PrepareCommandInput,
  PrepareResponse,
} from "../contracts/prepare.js"
import { prepareResponseSchema } from "../contracts/prepare.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

const DEFAULT_PREVIEW_DB_PREFIX = "medusa_pr_"
const DEFAULT_PREVIEW_DB_APP_USER_PREFIX = "medusa_pr_app_"

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
  const response = prepareResponseSchema.parse({
    lane: "main",
    prepared: false,
    requires_meili_keys: false,
    note: "main_prepare_not_used",
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

export async function executePrepare(
  input: PrepareCommandInput
): Promise<PrepareExecutionResult> {
  if (input.lane === "preview") {
    return await executePreviewPrepare(input)
  }

  return await executeMainPrepare(input)
}
