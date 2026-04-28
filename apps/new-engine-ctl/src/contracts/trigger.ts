import { readFile } from "node:fs/promises"

import { z } from "zod"

import { resolveTargetsResponseSchema } from "./resolve-targets.js"

const triggeredDeploymentSchema = z.looseObject({
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  service_type: z.string().nullable().optional(),
  deployment_hash: z.string().min(1),
  status: z.string().min(1),
})

export const triggerCommandInputSchema = z
  .object({
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    environmentName: z.string().min(1, "Environment name is required."),
    targetsJsonPath: z.string().min(1),
    gitCommitSha: z.string().min(1).optional(),
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

export const triggerResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  git_commit_sha: z.string().nullable(),
  triggered_service_ids: z.array(z.string()),
  services: z.array(triggeredDeploymentSchema),
})

const targetsEnvelopeSchema = z.object({
  services: resolveTargetsResponseSchema.shape.services,
})

export type TriggerCommandInput = z.infer<typeof triggerCommandInputSchema>
export type TriggerResponse = z.infer<typeof triggerResponseSchema>

export async function resolveTriggerTargets(
  targetsJsonPath: string
): Promise<z.infer<typeof targetsEnvelopeSchema>["services"]> {
  const raw = await readFile(targetsJsonPath, "utf8")

  return targetsEnvelopeSchema.parse(JSON.parse(raw)).services
}
