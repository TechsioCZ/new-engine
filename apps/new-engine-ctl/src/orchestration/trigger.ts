import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  resolveTriggerTargets,
  type TriggerCommandInput,
  type TriggerResponse,
  triggerResponseSchema,
} from "../contracts/trigger.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeTrigger(
  input: TriggerCommandInput
): Promise<TriggerResponse> {
  const targets = await resolveTriggerTargets(input.targetsJsonPath)
  const response = await executeTriggerPayload({
    projectSlug: input.projectSlug,
    environmentName: input.environmentName,
    targets,
    gitCommitSha: input.gitCommitSha,
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

export async function executeTriggerPayload(input: {
  projectSlug: string
  environmentName: string
  targets: Awaited<ReturnType<typeof resolveTriggerTargets>>
  gitCommitSha?: string
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<TriggerResponse> {
  const { targets } = input

  return input.dryRun
    ? triggerResponseSchema.parse({
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        git_commit_sha: input.gitCommitSha ?? null,
        triggered_service_ids: targets.map((target) => target.service_id),
        services: targets.map((target) => ({
          service_id: target.service_id,
          service_slug: target.service_slug,
          service_type: target.service_type ?? null,
          deployment_hash: `dry-run:deploy:${target.service_slug}`,
          status: "HEALTHY",
        })),
      })
    : await new ZaneOperatorClient(
        input.baseUrl,
        input.apiToken
      ).triggerDeploys({
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        targets,
        git_commit_sha: input.gitCommitSha,
      })
}
