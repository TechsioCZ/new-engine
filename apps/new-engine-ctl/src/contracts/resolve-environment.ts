import { z } from "zod"

import { laneSchema } from "./stack-manifest.js"

export const resolveEnvironmentCommandInputSchema = z
  .object({
    lane: laneSchema,
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    prNumber: z.number().int().positive().optional(),
    environmentName: z.string().default(""),
    previewClonedServiceIdsCsv: z.string().default(""),
    previewExcludedServiceIdsCsv: z.string().default(""),
    outputJson: z.string().min(1).optional(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    dryRun: z.boolean().default(false),
    dryRunCreated: z.boolean().default(false),
    stackManifestPath: z.string().min(1),
    previewEnvPrefix: z.string().min(1).default("pr-"),
  })
  .superRefine((value, ctx) => {
    if (
      value.lane === "preview" &&
      !(value.environmentName || value.prNumber)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prNumber"],
        message: "Preview lane requires PR number or environment name.",
      })
    }

    if (value.lane === "main" && !value.environmentName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["environmentName"],
        message: "Main lane requires environment name.",
      })
    }

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

const warningSchema = z.looseObject({
  code: z.string().min(1).optional(),
  message: z.string().min(1),
})

export const resolveEnvironmentResponseSchema = z.object({
  lane: laneSchema,
  project_slug: z.string().min(1),
  environment_id: z.string().min(1),
  environment_name: z.string().min(1),
  is_preview: z.boolean().optional(),
  created: z.boolean().default(false),
  cloned_from_environment: z.string().nullable().optional(),
  ready: z.boolean().default(true),
  expected_preview_service_slugs: z.array(z.string()).default([]),
  excluded_preview_service_slugs: z.array(z.string()).default([]),
  present_service_slugs: z.array(z.string()).default([]),
  missing_preview_service_slugs: z.array(z.string()).default([]),
  warnings: z.array(warningSchema).default([]),
})

export type ResolveEnvironmentCommandInput = z.infer<
  typeof resolveEnvironmentCommandInputSchema
>
export type ResolveEnvironmentResponse = z.infer<
  typeof resolveEnvironmentResponseSchema
>
