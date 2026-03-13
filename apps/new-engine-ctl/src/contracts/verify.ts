import { readFile } from "node:fs/promises"

import { z } from "zod"

import { laneSchema } from "./stack-manifest.js"

export const envOverrideSchema = z.object({
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  env: z.record(z.string(), z.string()),
})

const requiredPersistedEnvSchema = z.object({
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  env_keys: z.array(z.string().min(1)),
})

const deploymentRefSchema = z.looseObject({
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  deployment_hash: z.string().min(1),
  status: z.string().optional(),
})

const deploymentEnvelopeSchema = z.looseObject({
  services: z.array(deploymentRefSchema).default([]),
})

export const previewRandomOnceSecretInputSchema = z.looseObject({
  targets: z
    .array(
      z.looseObject({
        service_id: z.string().min(1),
        env_var: z.string().min(1),
      })
    )
    .default([]),
  value: z.string().min(1),
})

export const verifyCommandInputSchema = z
  .object({
    lane: laneSchema,
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    environmentName: z.string().min(1, "Environment name is required."),
    requestedServicesCsv: z.string().default(""),
    deployServicesCsv: z.string().default(""),
    triggeredServicesCsv: z.string().default(""),
    previewDbName: z.string().default(""),
    previewDbUser: z.string().default(""),
    previewDbPassword: z.string().default(""),
    previewRandomOnceSecrets: z
      .array(previewRandomOnceSecretInputSchema)
      .default([]),
    meiliFrontendKey: z.string().default(""),
    meiliFrontendEnvVar: z.string().default(""),
    meiliBackendKey: z.string().default(""),
    deployments: z.array(deploymentRefSchema).default([]),
    outputJson: z.string().min(1).optional(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    dryRun: z.boolean().default(false),
    stackManifestPath: z.string().min(1),
    stackInputsPath: z.string().min(1),
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

export const verifyResponseSchema = z.object({
  lane: laneSchema,
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  verified: z.boolean(),
  requested_service_ids: z.array(z.string()),
  deploy_service_ids: z.array(z.string()),
  triggered_service_ids: z.array(z.string()),
  checked_env_override_service_ids: z.array(z.string()),
  checked_persisted_env_service_ids: z.array(z.string()),
  checked_deployment_service_ids: z.array(z.string()),
  checked_deployments: z.array(
    z.object({
      service_id: z.string().min(1),
      service_slug: z.string().min(1),
      deployment_hash: z.string().min(1),
      status: z.string().min(1),
      status_reason: z.string().nullable(),
    })
  ),
})

export type VerifyCommandInput = z.infer<typeof verifyCommandInputSchema>
export type EnvOverride = z.infer<typeof envOverrideSchema>
export type RequiredPersistedEnv = z.infer<typeof requiredPersistedEnvSchema>
export type DeploymentRef = z.infer<typeof deploymentRefSchema>
export type PreviewRandomOnceSecretInput = z.infer<
  typeof previewRandomOnceSecretInputSchema
>
export type VerifyResponse = z.infer<typeof verifyResponseSchema>
type DeploymentVerifyRef = Pick<
  DeploymentRef,
  "service_id" | "service_slug" | "deployment_hash"
>

export type VerifyDeployPayload = {
  lane: z.infer<typeof laneSchema>
  project_slug: string
  environment_name: string
  requested_service_ids: string[]
  deploy_service_ids: string[]
  triggered_service_ids: string[]
  expected_env_overrides: EnvOverride[]
  required_persisted_env: RequiredPersistedEnv[]
  deployments: DeploymentVerifyRef[]
}

function parseJson<T>(raw: string, schema: z.ZodType<T>, label: string): T {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${label} must be valid JSON: ${message}`)
  }

  return schema.parse(parsed)
}

export function parsePreviewRandomOnceSecrets(
  raw: string | undefined
): PreviewRandomOnceSecretInput[] {
  const value = raw?.trim()
  if (!value) {
    return []
  }

  return parseJson(
    value,
    z.array(previewRandomOnceSecretInputSchema),
    "--preview-random-once-secrets-json"
  )
}

export async function resolveDeploymentRefs(
  deploymentsJsonPath: string | undefined,
  deploymentsJsonInline: string | undefined
): Promise<DeploymentRef[]> {
  if (deploymentsJsonPath && deploymentsJsonInline) {
    throw new Error(
      "Pass only one of --deployments-json or --deployments-json-inline."
    )
  }

  if (deploymentsJsonPath) {
    const raw = await readFile(deploymentsJsonPath, "utf8")
    const envelope = parseJson(
      raw,
      deploymentEnvelopeSchema,
      deploymentsJsonPath
    )
    return envelope.services
  }

  if (deploymentsJsonInline?.trim()) {
    const envelope = parseJson(
      deploymentsJsonInline,
      deploymentEnvelopeSchema,
      "--deployments-json-inline"
    )
    return envelope.services
  }

  return []
}
