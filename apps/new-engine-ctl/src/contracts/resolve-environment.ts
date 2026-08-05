import { z } from "zod"

import { laneSchema } from "./stack-manifest.js"

export const resolveEnvironmentCommandInputSchema = z
  .object({
    apiToken: z.string().default(""),
    baseUrl: z.string().default(""),
    dryRun: z.boolean().default(false),
    dryRunCreated: z.boolean().default(false),
    environmentName: z.string().default(""),
    lane: laneSchema,
    outputJson: z.string().min(1).optional(),
    prNumber: z.number().int().positive().optional(),
    previewClonedServiceIdsCsv: z.string().default(""),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    previewExcludedServiceIdsCsv: z.string().default(""),
    previewGitBranch: z.string().default(""),
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    reconcileServiceIdsCsv: z.string().default(""),
    sourceEnvironmentName: z.string().default(""),
    stackInputsPath: z.string().min(1),
    stackManifestPath: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (
      value.lane === "preview" &&
      value.environmentName.length === 0 &&
      value.prNumber === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Preview lane requires PR number or environment name.",
        path: ["prNumber"],
      })
    }

    if (
      value.lane === "preview" &&
      !(value.dryRun || value.sourceEnvironmentName)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Preview lane requires canonical source environment name.",
        path: ["sourceEnvironmentName"],
      })
    }

    if (value.lane === "main" && !value.environmentName) {
      ctx.addIssue({
        code: "custom",
        message: "Main lane requires environment name.",
        path: ["environmentName"],
      })
    }

    if (!(value.dryRun || value.baseUrl)) {
      ctx.addIssue({
        code: "custom",
        message: "Zane operator base URL is required.",
        path: ["baseUrl"],
      })
    }

    if (!(value.dryRun || value.apiToken)) {
      ctx.addIssue({
        code: "custom",
        message: "Zane operator API token is required.",
        path: ["apiToken"],
      })
    }
  })

const warningSchema = z.looseObject({
  code: z.string().min(1).optional(),
  message: z.string().min(1),
})

export const resolveEnvironmentResponseSchema = z.object({
  baseline_complete: z.boolean().default(false),
  cloned_from_environment: z.string().nullable().optional(),
  created: z.boolean().default(false),
  environment_id: z.string().min(1),
  environment_name: z.string().min(1),
  excluded_preview_service_slugs: z.array(z.string()).default([]),
  expected_preview_service_slugs: z.array(z.string()).default([]),
  is_preview: z.boolean().optional(),
  lane: laneSchema,
  missing_preview_service_slugs: z.array(z.string()).default([]),
  present_service_slugs: z.array(z.string()).default([]),
  project_slug: z.string().min(1),
  ready: z.boolean().default(true),
  warnings: z.array(warningSchema).default([]),
})

export type ResolveEnvironmentCommandInput = z.input<
  typeof resolveEnvironmentCommandInputSchema
>
export type ResolvedEnvironmentCommandInput = z.infer<
  typeof resolveEnvironmentCommandInputSchema
>
export type ResolveEnvironmentResponse = z.infer<
  typeof resolveEnvironmentResponseSchema
>
