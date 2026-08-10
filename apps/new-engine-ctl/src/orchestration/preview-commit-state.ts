import { mkdir, writeFile } from "node:fs/promises"
import nodePath from "node:path"

import type {
  PreviewCommitStateCommandInput,
  PreviewCommitStateResponse,
} from "../contracts/preview-commit-state.js"
import { previewCommitStateResponseSchema } from "../contracts/preview-commit-state.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

const buildPreviewEnvironmentName = (
  input: PreviewCommitStateCommandInput,
): string => {
  if (input.environmentName) {
    return input.environmentName
  }

  return `${input.previewEnvPrefix}${input.prNumber}`
}

const writeJsonFile = async (path: string, value: unknown): Promise<void> => {
  await mkdir(nodePath.dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export const executePreviewCommitState = async (
  input: PreviewCommitStateCommandInput,
): Promise<PreviewCommitStateResponse> => {
  const environmentName = buildPreviewEnvironmentName(input)

  const response = input.dryRun
    ? previewCommitStateResponseSchema.parse({
        baseline_complete: false,
        environment_exists: false,
        environment_name: environmentName,
        last_deployed_commit_sha: null,
        project_slug: input.projectSlug,
        target_commit_sha: null,
      })
    : await new ZaneOperatorClient(
        input.baseUrl,
        input.apiToken,
      ).readPreviewCommitState({
        environment_name: environmentName,
        project_slug: input.projectSlug,
      })

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}
