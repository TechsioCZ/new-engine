import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  PreviewCommitStateCommandInput,
  PreviewCommitStateResponse,
} from "../contracts/preview-commit-state.js"
import { previewCommitStateResponseSchema } from "../contracts/preview-commit-state.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

function buildPreviewEnvironmentName(
  input: PreviewCommitStateCommandInput
): string {
  if (input.environmentName) {
    return input.environmentName
  }

  return `${input.previewEnvPrefix}${input.prNumber}`
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executePreviewCommitState(
  input: PreviewCommitStateCommandInput
): Promise<PreviewCommitStateResponse> {
  const environmentName = buildPreviewEnvironmentName(input)

  const response = input.dryRun
    ? previewCommitStateResponseSchema.parse({
        project_slug: input.projectSlug,
        environment_name: environmentName,
        environment_exists: false,
        baseline_complete: false,
        target_commit_sha: null,
        last_deployed_commit_sha: null,
      })
    : await new ZaneOperatorClient(
        input.baseUrl,
        input.apiToken
      ).readPreviewCommitState({
        project_slug: input.projectSlug,
        environment_name: environmentName,
      })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
