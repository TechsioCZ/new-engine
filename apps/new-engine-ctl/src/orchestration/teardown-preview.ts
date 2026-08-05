import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  TeardownPreviewCommandInput,
  TeardownPreviewResponse,
} from "../contracts/teardown-preview.js"
import { teardownPreviewResponseSchema } from "../contracts/teardown-preview.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export async function executeTeardownPreview(
  input: TeardownPreviewCommandInput
): Promise<TeardownPreviewResponse> {
  const environmentName = `${input.previewEnvPrefix}${input.prNumber}`

  let environment: TeardownPreviewResponse["environment"]
  let previewDb: TeardownPreviewResponse["preview_db"]

  if (input.dryRun) {
    environment = {
      deleted: true,
      environment_name: environmentName,
      error: null,
      http_code: 200,
      noop: false,
      noop_reason: null,
      ok: true,
      status: "success",
    }
    previewDb = {
      db_name: `medusa_pr_${input.prNumber}`,
      deleted: true,
      dev_grants_cleaned: true,
      error: null,
      http_code: 200,
      noop: false,
      noop_reason: null,
      ok: true,
      role_deleted: true,
      status: "success",
    }
  } else {
    const client = new ZaneOperatorClient(input.baseUrl, input.apiToken)

    try {
      const response = await client.archiveEnvironment({
        environment_name: environmentName,
        project_slug: input.projectSlug,
      })
      environment = {
        deleted: response.body.deleted,
        environment_name: response.body.environment_name,
        error: null,
        http_code: response.httpCode,
        noop: response.body.noop,
        noop_reason: response.body.noop_reason,
        ok: true,
        status: "success",
      }
    } catch (error) {
      environment = {
        deleted: false,
        environment_name: environmentName,
        error: error instanceof Error ? error.message : String(error),
        http_code: 0,
        noop: false,
        noop_reason: null,
        ok: false,
        status: "failed",
      }
    }

    try {
      const response = await client.teardownPreviewDb(input.prNumber)
      previewDb = {
        db_name: response.body.db_name,
        deleted: response.body.deleted,
        dev_grants_cleaned: response.body.dev_grants_cleaned,
        error: null,
        http_code: response.httpCode,
        noop: response.body.noop,
        noop_reason: response.body.noop_reason,
        ok: true,
        role_deleted: response.body.role_deleted,
        status: "success",
      }
    } catch (error) {
      previewDb = {
        db_name: `medusa_pr_${input.prNumber}`,
        deleted: false,
        dev_grants_cleaned: false,
        error: error instanceof Error ? error.message : String(error),
        http_code: 0,
        noop: false,
        noop_reason: null,
        ok: false,
        role_deleted: false,
        status: "failed",
      }
    }
  }

  const response = teardownPreviewResponseSchema.parse({
    environment,
    pr_number: input.prNumber,
    preview_db: previewDb,
    project_slug: input.projectSlug,
    success: environment.ok && previewDb.ok,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
