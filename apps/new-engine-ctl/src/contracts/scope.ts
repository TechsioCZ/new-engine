import { z } from "zod"

import { laneSchema } from "./stack-manifest.js"

export const scopeModeSchema = z.enum(["git", "explicit"])
export const nxStatusSchema = z.enum(["ok", "fallback", "explicit"])

export const scopeCommandInputSchema = z
  .object({
    lane: laneSchema,
    servicesCsv: z.string().default(""),
    baseSha: z.string().min(1).optional(),
    headSha: z.string().min(1).default("HEAD"),
    outputJson: z.string().min(1).optional(),
    stackManifestPath: z.string().min(1),
    nxIsolatePlugins: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (!(value.servicesCsv || value.baseSha)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseSha"],
        message:
          "Base SHA is required when services-csv is not provided explicitly.",
      })
    }
  })

export const scopeResponseSchema = z.object({
  lane: laneSchema,
  mode: scopeModeSchema,
  base_sha: z.string().nullable(),
  head_sha: z.string().nullable(),
  projects_csv: z.string(),
  services_csv: z.string(),
  nx_status: nxStatusSchema,
  changed_files_count: z.number().int().nonnegative(),
  changed_files: z.array(z.string()),
  relevant_changed_files: z.array(z.string()),
  should_prepare: z.boolean(),
  requires_preview_db: z.boolean(),
  requires_meili_keys: z.boolean(),
  preview_db_service_ids: z.string(),
  meili_key_service_ids: z.string(),
  requires_downtime_approval: z.boolean(),
  downtime_service_ids: z.string(),
})

export type ScopeCommandInput = z.infer<typeof scopeCommandInputSchema>
export type ScopeResponse = z.infer<typeof scopeResponseSchema>
