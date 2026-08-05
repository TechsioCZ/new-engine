import { z } from "zod"

import { laneSchema } from "./stack-manifest.js"

const scopeModeSchema = z.enum(["git", "explicit"])
const nxStatusSchema = z.enum(["ok", "fallback", "explicit"])

export const scopeCommandInputSchema = z
  .object({
    baseSha: z.string().min(1).optional(),
    headSha: z.string().min(1).default("HEAD"),
    lane: laneSchema,
    nxIsolatePlugins: z.boolean().default(true),
    outputJson: z.string().min(1).optional(),
    previewBaselineComplete: z.boolean().default(true),
    servicesCsv: z.string().default(""),
    stackInputsPath: z.string().min(1),
    stackManifestPath: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (!(value.servicesCsv || value.baseSha)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Base SHA is required when services-csv is not provided explicitly.",
        path: ["baseSha"],
      })
    }
  })

export const scopeResponseSchema = z.object({
  base_sha: z.string().nullable(),
  changed_files: z.array(z.string()),
  changed_files_count: z.number().int().nonnegative(),
  downtime_service_ids: z.string(),
  head_sha: z.string().nullable(),
  lane: laneSchema,
  mode: scopeModeSchema,
  nx_status: nxStatusSchema,
  preview_db_service_ids: z.string(),
  projects_csv: z.string(),
  relevant_changed_files: z.array(z.string()),
  requires_downtime_approval: z.boolean(),
  requires_preview_db: z.boolean(),
  services_csv: z.string(),
  should_prepare: z.boolean(),
})

export type ScopeCommandInput = z.infer<typeof scopeCommandInputSchema>
export type ScopeResponse = z.infer<typeof scopeResponseSchema>
