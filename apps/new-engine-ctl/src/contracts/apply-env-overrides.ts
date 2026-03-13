import { readFile } from "node:fs/promises"

import { z } from "zod"

import { renderEnvOverridesResponseSchema } from "./render-env-overrides.js"
import { resolveTargetsResponseSchema } from "./resolve-targets.js"

const targetsEnvelopeSchema = z.object({
  services: resolveTargetsResponseSchema.shape.services,
})

const envOverridesEnvelopeSchema = z.object({
  services: renderEnvOverridesResponseSchema.shape.services,
})

const appliedChangeSchema = z.looseObject({
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  key: z.string().min(1),
  change_type: z.enum(["ADD", "UPDATE", "SKIP"]),
})

export const applyEnvOverridesCommandInputSchema = z
  .object({
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    environmentName: z.string().min(1, "Environment name is required."),
    targetsJsonPath: z.string().min(1),
    envOverridesJsonPath: z.string().min(1),
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

export const applyEnvOverridesResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  noop: z.boolean(),
  applied_service_ids: z.array(z.string()),
  applied_changes: z.array(appliedChangeSchema).default([]),
})

export type ApplyEnvOverridesCommandInput = z.infer<
  typeof applyEnvOverridesCommandInputSchema
>
export type ApplyEnvOverridesResponse = z.infer<
  typeof applyEnvOverridesResponseSchema
>

export async function resolveApplyEnvOverridesInputs(
  targetsJsonPath: string,
  envOverridesJsonPath: string
): Promise<{
  targets: z.infer<typeof targetsEnvelopeSchema>["services"]
  envOverrides: z.infer<typeof envOverridesEnvelopeSchema>["services"]
}> {
  const [targetsRaw, envOverridesRaw] = await Promise.all([
    readFile(targetsJsonPath, "utf8"),
    readFile(envOverridesJsonPath, "utf8"),
  ])

  return {
    targets: targetsEnvelopeSchema.parse(JSON.parse(targetsRaw)).services,
    envOverrides: envOverridesEnvelopeSchema.parse(JSON.parse(envOverridesRaw))
      .services,
  }
}

export type ApplyEnvOverridesPayload = {
  project_slug: string
  environment_name: string
  targets: z.infer<typeof targetsEnvelopeSchema>["services"]
  env_overrides: z.infer<typeof envOverridesEnvelopeSchema>["services"]
}
