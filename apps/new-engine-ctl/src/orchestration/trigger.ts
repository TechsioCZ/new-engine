import {
  resolveTriggerTargets,
  type TriggerResponse,
  triggerResponseSchema,
} from "../contracts/trigger.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

export async function executeTriggerPayload(input: {
  projectSlug: string
  environmentName: string
  targets: Awaited<ReturnType<typeof resolveTriggerTargets>>
  gitCommitSha?: string | undefined
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
