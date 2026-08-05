import { readFile } from "node:fs/promises"

import { z } from "zod"

import { planResponseSchema } from "./plan.js"
import { laneSchema } from "./stack-manifest.js"
import { requireLiveZaneCredentials } from "./zane-credentials.js"

const targetDeploymentSchema = z.looseObject({
  commit_sha: z.string().nullable().optional(),
  deployment_hash: z.string().min(1),
  env: z.record(z.string(), z.string()).optional(),
  status: z.string().min(1),
})

const resolvedTargetSchema = z.looseObject({
  active_deployment: targetDeploymentSchema.nullable().optional(),
  configured_commit_sha: z.string().nullable().optional(),
  current_production_deployment: targetDeploymentSchema.nullable().optional(),
  deploy_token: z.string().optional(),
  deploy_url: z.string().optional(),
  details_url: z.string().optional(),
  env_change_url: z.string().optional(),
  has_unapplied_changes: z.boolean().optional(),
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  service_type: z.string().optional(),
})

export const resolveTargetsCommandInputSchema = z
  .object({
    apiToken: z.string().default(""),
    baseUrl: z.string().default(""),
    dryRun: z.boolean().default(false),
    environmentName: z.string().min(1, "Environment name is required."),
    lane: laneSchema,
    outputJson: z.string().min(1).optional(),
    planJsonPath: z.string().min(1),
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
  })
  .superRefine(requireLiveZaneCredentials)

export const resolveTargetsResponseSchema = z.object({
  adopted_deployments: z.array(z.unknown()).optional(),
  environment_name: z.string().min(1),
  project_slug: z.string().min(1),
  services: z.array(resolvedTargetSchema),
  skipped_services: z.array(z.unknown()).optional(),
})

export type ResolveTargetsCommandInput = z.infer<
  typeof resolveTargetsCommandInputSchema
>
export type ResolveTargetsResponse = z.infer<
  typeof resolveTargetsResponseSchema
>

function extractPlanServices(plan: z.infer<typeof planResponseSchema>): {
  service_id: string
  service_slug: string
}[] {
  return plan.deploy_services.map((service) => ({
    service_id: service.id,
    service_slug: service.service_slug,
  }))
}

export async function resolvePlanServices(planJsonPath: string): Promise<
  {
    service_id: string
    service_slug: string
  }[]
> {
  const raw = await readFile(planJsonPath, "utf-8")
  const plan = planResponseSchema.parse(JSON.parse(raw))

  return extractPlanServices(plan)
}

export interface ResolveTargetsPayload {
  lane: z.infer<typeof laneSchema>
  project_slug: string
  environment_name: string
  services: Array<{
    service_id: string
    service_slug: string
  }>
}
