import { readFile } from "node:fs/promises"

import { z } from "zod"

import { renderEnvOverridesResponseSchema } from "./render-env-overrides.js"
import { resolveTargetsResponseSchema } from "./resolve-targets.js"
import { requireLiveZaneCredentials } from "./zane-credentials.js"

const targetsEnvelopeSchema = z.object({
  services: resolveTargetsResponseSchema.shape.services,
})

const envOverridesEnvelopeSchema = z.object({
  services: renderEnvOverridesResponseSchema.shape.services,
})

const appliedChangeSchema = z.looseObject({
  change_type: z.enum(["ADD", "UPDATE", "SKIP"]),
  key: z.string().min(1),
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
})

export const applyEnvOverridesCommandInputSchema = z
  .object({
    apiToken: z.string().default(""),
    baseUrl: z.string().default(""),
    dryRun: z.boolean().default(false),
    envOverridesJsonPath: z.string().min(1),
    environmentName: z.string().min(1, "Environment name is required."),
    outputJson: z.string().min(1).optional(),
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    targetsJsonPath: z.string().min(1),
  })
  .superRefine(requireLiveZaneCredentials)

export const applyEnvOverridesResponseSchema = z.object({
  applied_changes: z.array(appliedChangeSchema).default([]),
  applied_service_ids: z.array(z.string()),
  environment_name: z.string().min(1),
  noop: z.boolean(),
  project_slug: z.string().min(1),
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
    readFile(targetsJsonPath, "utf-8"),
    readFile(envOverridesJsonPath, "utf-8"),
  ])

  return {
    envOverrides: envOverridesEnvelopeSchema.parse(JSON.parse(envOverridesRaw))
      .services,
    targets: targetsEnvelopeSchema.parse(JSON.parse(targetsRaw)).services,
  }
}

export interface ApplyEnvOverridesPayload {
  project_slug: string
  environment_name: string
  targets: z.infer<typeof targetsEnvelopeSchema>["services"]
  env_overrides: z.infer<typeof envOverridesEnvelopeSchema>["services"]
}
