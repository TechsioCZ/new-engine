import { triggerResponseSchema } from "../contracts/trigger.js"
import type {
  resolveTriggerTargets,
  TriggerResponse,
} from "../contracts/trigger.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

export const executeTriggerPayload = async (input: {
  projectSlug: string
  environmentName: string
  targets: Awaited<ReturnType<typeof resolveTriggerTargets>>
  gitCommitSha?: string | undefined
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<TriggerResponse> => {
  const { targets } = input

  return input.dryRun
    ? triggerResponseSchema.parse({
        environment_name: input.environmentName,
        git_commit_sha: input.gitCommitSha ?? null,
        project_slug: input.projectSlug,
        services: targets.map((target) => ({
          deployment_hash: `dry-run:deploy:${target.service_slug}`,
          service_id: target.service_id,
          service_slug: target.service_slug,
          service_type: target.service_type ?? null,
          status: "HEALTHY",
        })),
        triggered_service_ids: targets.map((target) => target.service_id),
      })
    : await new ZaneOperatorClient(
        input.baseUrl,
        input.apiToken,
      ).triggerDeploys({
        environment_name: input.environmentName,
        git_commit_sha: input.gitCommitSha,
        project_slug: input.projectSlug,
        targets,
      })
}
