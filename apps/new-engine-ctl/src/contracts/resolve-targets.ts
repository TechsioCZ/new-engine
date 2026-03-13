import { readFile } from "node:fs/promises"

import { z } from "zod"
import { planResponseSchema } from "./plan.js"
import { laneSchema } from "./stack-manifest.js"

const targetDeploymentSchema = z.looseObject({
  deployment_hash: z.string().min(1),
  status: z.string().min(1),
  commit_sha: z.string().nullable().optional(),
  env: z.record(z.string(), z.string()).optional(),
})

const resolvedTargetSchema = z.looseObject({
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  service_type: z.string().optional(),
  configured_commit_sha: z.string().nullable().optional(),
  deploy_token: z.string().optional(),
  deploy_url: z.string().optional(),
  env_change_url: z.string().optional(),
  details_url: z.string().optional(),
  has_unapplied_changes: z.boolean().optional(),
  current_production_deployment: targetDeploymentSchema.nullable().optional(),
  active_deployment: targetDeploymentSchema.nullable().optional(),
})

export const resolveTargetsCommandInputSchema = z
  .object({
    lane: laneSchema,
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    environmentName: z.string().min(1, "Environment name is required."),
    planJsonPath: z.string().min(1),
    outputJson: z.string().min(1).optional(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    dryRun: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (!(value.dryRun || value.baseUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseUrl"],
        message: "Zane operator base URL is required.",
      })
    }

    if (!(value.dryRun || value.apiToken)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apiToken"],
        message: "Zane operator API token is required.",
      })
    }
  })

export const resolveTargetsResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  services: z.array(resolvedTargetSchema),
  skipped_services: z.array(z.unknown()).optional(),
  adopted_deployments: z.array(z.unknown()).optional(),
})

export type ResolveTargetsCommandInput = z.infer<
  typeof resolveTargetsCommandInputSchema
>
export type ResolveTargetsResponse = z.infer<
  typeof resolveTargetsResponseSchema
>
export type ResolvedTarget = z.infer<typeof resolvedTargetSchema>

export function extractPlanServices(
  plan: z.infer<typeof planResponseSchema>
): Array<{
  service_id: string
  service_slug: string
}> {
  return plan.deploy_services.map((service) => ({
    service_id: service.id,
    service_slug: service.service_slug,
  }))
}

export async function resolvePlanServices(planJsonPath: string): Promise<
  Array<{
    service_id: string
    service_slug: string
  }>
> {
  const raw = await readFile(planJsonPath, "utf8")
  const plan = planResponseSchema.parse(JSON.parse(raw))

  return extractPlanServices(plan)
}

export type ResolveTargetsPayload = {
  lane: z.infer<typeof laneSchema>
  project_slug: string
  environment_name: string
  services: Array<{
    service_id: string
    service_slug: string
  }>
}
