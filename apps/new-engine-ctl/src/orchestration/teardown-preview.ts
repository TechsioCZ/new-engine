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
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeTeardownPreview(
  input: TeardownPreviewCommandInput
): Promise<TeardownPreviewResponse> {
  const environmentName = `${input.previewEnvPrefix}${input.prNumber}`

  let environment: TeardownPreviewResponse["environment"]
  let previewDb: TeardownPreviewResponse["preview_db"]

  if (input.dryRun) {
    environment = {
      ok: true,
      http_code: 200,
      status: "success",
      deleted: true,
      environment_name: environmentName,
      noop: false,
      noop_reason: null,
      error: null,
    }
    previewDb = {
      ok: true,
      http_code: 200,
      status: "success",
      deleted: true,
      db_name: `medusa_pr_${input.prNumber}`,
      noop: false,
      noop_reason: null,
      role_deleted: true,
      dev_grants_cleaned: true,
      error: null,
    }
  } else {
    const client = new ZaneOperatorClient(input.baseUrl, input.apiToken)

    try {
      const response = await client.archiveEnvironment({
        project_slug: input.projectSlug,
        environment_name: environmentName,
      })
      environment = {
        ok: true,
        http_code: response.httpCode,
        status: "success",
        deleted: response.body.deleted,
        environment_name: response.body.environment_name,
        noop: response.body.noop,
        noop_reason: response.body.noop_reason,
        error: null,
      }
    } catch (error) {
      environment = {
        ok: false,
        http_code: 0,
        status: "failed",
        deleted: false,
        environment_name: environmentName,
        noop: false,
        noop_reason: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    try {
      const response = await client.teardownPreviewDb(input.prNumber)
      previewDb = {
        ok: true,
        http_code: response.httpCode,
        status: "success",
        deleted: response.body.deleted,
        db_name: response.body.db_name,
        noop: response.body.noop,
        noop_reason: response.body.noop_reason,
        role_deleted: response.body.role_deleted,
        dev_grants_cleaned: response.body.dev_grants_cleaned,
        error: null,
      }
    } catch (error) {
      previewDb = {
        ok: false,
        http_code: 0,
        status: "failed",
        deleted: false,
        db_name: `medusa_pr_${input.prNumber}`,
        noop: false,
        noop_reason: null,
        role_deleted: false,
        dev_grants_cleaned: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const response = teardownPreviewResponseSchema.parse({
    project_slug: input.projectSlug,
    pr_number: input.prNumber,
    environment,
    preview_db: previewDb,
    success: environment.ok && previewDb.ok,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
